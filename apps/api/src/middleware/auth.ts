import type { NextFunction, Request, Response } from "express";
import { isProd } from "../config/env.js";
import { resolveMerchantSession } from "../services/auth.service.js";

export async function requireMerchantSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token && !isProd) return next();
    if (!token) return res.status(401).json({ error: "Authentication required." });

    const session = await resolveMerchantSession(token);
    if (!session) return res.status(401).json({ error: "Session is invalid or expired." });
    const pathMerchantId = req.path.match(/^\/merchants\/([^/]+)/)?.[1];
    const requestedMerchantId = req.params.merchantId ?? req.params.id ?? pathMerchantId;
    if (requestedMerchantId && requestedMerchantId !== session.merchantId) {
      return res.status(403).json({ error: "You cannot access another merchant's data." });
    }
    (req as Request & { merchantSessionId?: string; merchantId?: string }).merchantSessionId = session.id;
    (req as Request & { merchantSessionId?: string; merchantId?: string }).merchantId = session.merchantId;
    next();
  } catch (error) {
    next(error);
  }
}
