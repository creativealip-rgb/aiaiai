import "server-only";

import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accountStocks,
  products,
  productVariants,
  type AccountStockStatus,
} from "@/db/schema";
import { encryptCredential } from "@/lib/crypto";
import {
  stockBulkImportSchema,
  stockCreateSchema,
  stockStatusUpdateSchema,
  type StockBulkImportInput,
  type StockCreateInput,
  type StockStatusUpdateInput,
} from "@/lib/schemas/stocks";

export class StockValidationError extends Error {
  readonly code: string;
  constructor(message: string, code = "STOCK_VALIDATION_ERROR") {
    super(message);
    this.name = "StockValidationError";
    this.code = code;
  }
}

async function ensureVariantBelongsToProduct(productId: string, variantId: string): Promise<void> {
  const [variant] = await db
    .select({ id: productVariants.id, stockMode: productVariants.stockMode })
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .limit(1);

  if (!variant) {
    throw new StockValidationError("Varian tidak ditemukan pada produk yang dipilih.", "VARIANT_NOT_FOUND");
  }
  if (variant.stockMode !== "tracked") {
    throw new StockValidationError("Hanya varian tracked yang bisa punya stok akun.", "VARIANT_NOT_TRACKED");
  }
}

export async function createStock(input: StockCreateInput) {
  const parsed = stockCreateSchema.safeParse(input);
  if (!parsed.success) throw new StockValidationError("Data stok tidak valid.");

  await ensureVariantBelongsToProduct(parsed.data.productId, parsed.data.variantId);

  const encrypted = encryptCredential(parsed.data.credentialText);
  const [row] = await db
    .insert(accountStocks)
    .values({
      productId: parsed.data.productId,
      variantId: parsed.data.variantId,
      credentialCiphertext: encrypted.ciphertext,
      credentialIv: encrypted.iv,
      credentialTag: encrypted.tag,
      label: parsed.data.label || null,
      notes: parsed.data.notes || null,
      status: "available",
    })
    .returning();

  if (!row) throw new Error("Gagal membuat stok.");
  return row;
}

export async function updateStockStatus(input: StockStatusUpdateInput) {
  const parsed = stockStatusUpdateSchema.safeParse(input);
  if (!parsed.success) throw new StockValidationError("Data status stok tidak valid.");

  const [updated] = await db
    .update(accountStocks)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(accountStocks.id, parsed.data.id))
    .returning();

  if (!updated) throw new StockValidationError("Stok tidak ditemukan.", "STOCK_NOT_FOUND");
  return updated;
}

export async function deleteStock(id: string): Promise<void> {
  if (!id) throw new StockValidationError("ID stok tidak valid.");
  const [stock] = await db
    .select({ id: accountStocks.id, status: accountStocks.status })
    .from(accountStocks)
    .where(eq(accountStocks.id, id))
    .limit(1);
  if (!stock) throw new StockValidationError("Stok tidak ditemukan.", "STOCK_NOT_FOUND");
  if (stock.status === "sold") {
    throw new StockValidationError("Stok sold tidak boleh dihapus.", "SOLD_STOCK_IMMUTABLE");
  }
  await db.delete(accountStocks).where(eq(accountStocks.id, id));
}

function parseCsvRows(csvText: string): Array<{
  email: string;
  password: string;
  profile?: string;
  notes?: string;
}> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  let start = 0;
  const header = lines[0]?.toLowerCase();
  if (header && header.includes("email") && header.includes("password")) {
    start = 1;
  }

  const rows: Array<{ email: string; password: string; profile?: string; notes?: string }> = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]!;
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length < 2) continue;
    const [email, password, profile, notes] = parts;
    if (!email || !password) continue;
    rows.push({ email, password, profile, notes });
  }
  return rows;
}

export async function bulkImportStocks(input: StockBulkImportInput): Promise<{ inserted: number }> {
  const parsed = stockBulkImportSchema.safeParse(input);
  if (!parsed.success) throw new StockValidationError("Data import tidak valid.");

  await ensureVariantBelongsToProduct(parsed.data.productId, parsed.data.variantId);

  const rows = parseCsvRows(parsed.data.csvText);
  if (rows.length === 0) {
    throw new StockValidationError("Tidak ada baris CSV yang valid.", "CSV_EMPTY");
  }

  const now = new Date();
  const values = rows.map((row) => {
    const encrypted = encryptCredential({
      email: row.email,
      password: row.password,
      profile: row.profile || "",
      notes: row.notes || "",
    });
    return {
      productId: parsed.data.productId,
      variantId: parsed.data.variantId,
      credentialCiphertext: encrypted.ciphertext,
      credentialIv: encrypted.iv,
      credentialTag: encrypted.tag,
      label: row.profile || null,
      notes: row.notes || null,
      status: "available" as const,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db.insert(accountStocks).values(values);
  return { inserted: values.length };
}

export type ListAdminStocksInput = {
  status?: AccountStockStatus | "all";
  search?: string;
  productId?: string;
  variantId?: string;
  page?: number;
  pageSize?: number;
};

export type AdminStockRow = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  label: string | null;
  notes: string | null;
  status: AccountStockStatus;
  soldToOrderItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ListAdminStocksResult = {
  items: AdminStockRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listAdminStocks(
  input: ListAdminStocksInput = {},
): Promise<ListAdminStocksResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;

  const conditions = [] as Array<
    ReturnType<typeof eq> | ReturnType<typeof ilike>
  >;
  if (input.status && input.status !== "all") conditions.push(eq(accountStocks.status, input.status));
  if (input.productId) conditions.push(eq(accountStocks.productId, input.productId));
  if (input.variantId) conditions.push(eq(accountStocks.variantId, input.variantId));
  if (input.search?.trim()) {
    conditions.push(ilike(accountStocks.label, `%${input.search.trim()}%`));
  }

  const where = conditions.length === 0 ? undefined : and(...conditions);

  const [items, totalRes] = await Promise.all([
    db
      .select({
        id: accountStocks.id,
        productId: accountStocks.productId,
        variantId: accountStocks.variantId,
        productName: products.name,
        variantName: productVariants.name,
        sku: productVariants.sku,
        label: accountStocks.label,
        notes: accountStocks.notes,
        status: accountStocks.status,
        soldToOrderItemId: accountStocks.soldToOrderItemId,
        createdAt: accountStocks.createdAt,
        updatedAt: accountStocks.updatedAt,
      })
      .from(accountStocks)
      .innerJoin(products, eq(products.id, accountStocks.productId))
      .innerJoin(productVariants, eq(productVariants.id, accountStocks.variantId))
      .where(where)
      .orderBy(desc(accountStocks.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(accountStocks)
      .where(where ?? sql`true`),
  ]);

  const total = Number(totalRes[0]?.count ?? 0);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listTrackedVariantsForStockAdmin(): Promise<
  Array<{ id: string; name: string; sku: string; productId: string; productName: string }>
> {
  const rows = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      sku: productVariants.sku,
      productId: productVariants.productId,
      productName: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.stockMode, "tracked"),
        eq(productVariants.isActive, true),
        eq(products.isActive, true),
      ),
    )
    .orderBy(asc(products.name), asc(productVariants.sortOrder));

  return rows;
}
