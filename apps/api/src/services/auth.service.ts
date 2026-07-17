import crypto from "node:crypto";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, expectedHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function createMerchantSession(merchantId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60_000);
  await prisma.merchantSession.create({ data: { merchantId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}

export async function loginMerchant(email: string, password: string) {
  const merchant = await prisma.merchant.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!merchant?.passwordHash || !(await verifyPassword(password, merchant.passwordHash))) return null;
  const session = await createMerchantSession(merchant.id);
  return { merchant, ...session };
}

export async function resolveMerchantSession(token: string) {
  const session = await prisma.merchantSession.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  await prisma.merchantSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return session;
}
