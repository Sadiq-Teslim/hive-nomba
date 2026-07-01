import { prisma } from "../config/db.js";
import { nairaToKobo } from "../utils/money.js";

export interface CreateProductInput {
  name: string;
  priceNaira: number;
  stock?: number;
  description?: string;
  imageUrl?: string;
  sku?: string;
}

export async function createProduct(merchantId: string, input: CreateProductInput) {
  return prisma.product.create({
    data: {
      merchantId,
      name: input.name,
      description: input.description,
      priceKobo: nairaToKobo(input.priceNaira),
      stock: input.stock ?? 0,
      imageUrl: input.imageUrl,
      sku: input.sku,
    },
  });
}

export async function listProducts(merchantId: string, includeInactive = false) {
  return prisma.product.findMany({
    where: { merchantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: { createdAt: "desc" },
  });
}

/** Find a product for a merchant by (fuzzy) name. Returns the best single match. */
export async function findProductByName(merchantId: string, name: string) {
  return prisma.product.findFirst({
    where: { merchantId, active: true, name: { contains: name, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  priceNaira?: number;
  stock?: number;
  imageUrl?: string;
  active?: boolean;
}

export async function updateProduct(productId: string, input: UpdateProductInput) {
  const { priceNaira, ...rest } = input;
  return prisma.product.update({
    where: { id: productId },
    data: {
      ...rest,
      ...(priceNaira !== undefined ? { priceKobo: nairaToKobo(priceNaira) } : {}),
    },
  });
}

/** Add (positive) or remove (negative) units from stock, clamped at 0. */
export async function adjustStock(productId: string, delta: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");
  const stock = Math.max(0, product.stock + delta);
  return prisma.product.update({ where: { id: productId }, data: { stock } });
}

/** Active products at or below a stock threshold (includes out-of-stock). */
export async function lowStockProducts(merchantId: string, threshold = 5) {
  return prisma.product.findMany({
    where: { merchantId, active: true, stock: { lte: threshold } },
    orderBy: { stock: "asc" },
  });
}

/** Remove a product from the catalogue (soft delete — keeps it on past orders). */
export async function deactivateProduct(productId: string) {
  return prisma.product.update({ where: { id: productId }, data: { active: false } });
}
