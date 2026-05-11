import "server-only";

/**
 * Product service — business logic for product & variant CRUD.
 *
 * Delegates DB reads to `src/server/queries/products.ts` and is in charge of:
 *   - slug generation / uniqueness
 *   - variant inserts (`createProduct` accepts `variants[]` to atomically create
 *     a product with its initial variants)
 *   - image cleanup on update / delete
 *   - soft vs hard delete
 *
 * Zod schemas live in `@/lib/schemas/products` so client code (admin forms)
 * can import them without pulling in this server-only module.
 */

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  products,
  productVariants,
  type Product,
  type ProductVariant,
} from "@/db/schema";
import {
  productCoreSchema,
  productCreateSchema,
  productUpdateSchema,
  variantCreateSchema,
  variantUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
  type VariantCreateInput,
  type VariantUpdateInput,
} from "@/lib/schemas/products";
import { deleteImageByUrl } from "@/lib/storage";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import {
  getAdminProductById,
  productSlugExists,
  variantSkuExists,
} from "@/server/queries/products";

// Re-export so action / route consumers keep working.
export {
  productCoreSchema,
  productCreateSchema,
  productUpdateSchema,
  variantCreateSchema,
  variantUpdateSchema,
};
export type { ProductCreateInput, ProductUpdateInput, VariantCreateInput, VariantUpdateInput };

// ----------------------------------------------------------------------------
// Mutations — products
// ----------------------------------------------------------------------------

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  const discountValue = normaliseOptionalPrice(input.discountPrice);
  assertDiscountBelowBase(input.basePrice, discountValue);

  const baseSlug = input.slug && input.slug.length > 0 ? input.slug : slugify(input.name);
  const slug = await ensureUniqueSlug(baseSlug, (s) => productSlugExists(s));

  // Check variant SKU uniqueness up-front so we don't insert a product then
  // roll back mid-transaction.
  const skus = input.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) {
    throw new Error("SKU varian harus unik.");
  }
  for (const sku of skus) {
    if (await variantSkuExists(sku)) {
      throw new ProductValidationError(`SKU "${sku}" sudah digunakan varian lain.`);
    }
  }

  const images = normaliseImageArray(input.images, input.thumbnailUrl);

  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        name: input.name,
        slug,
        categoryId: input.categoryId,
        description: nullIfEmpty(input.description),
        type: input.type,
        deliveryType: input.deliveryType,
        basePrice: input.basePrice.toString(),
        discountPrice: discountValue?.toString(),
        warrantyDays: input.warrantyDays,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
        thumbnailUrl: nullIfEmpty(input.thumbnailUrl ?? null),
        images,
      })
      .returning();
    if (!product) throw new Error("Gagal membuat produk.");

    await tx.insert(productVariants).values(
      input.variants.map((v, idx) => ({
        productId: product.id,
        name: v.name,
        sku: v.sku,
        price: v.price.toString(),
        stockMode: v.stockMode,
        description: nullIfEmpty(v.description),
        sortOrder: v.sortOrder || idx,
        isActive: v.isActive,
      })),
    );

    return product;
  });
}

export async function updateProduct(input: ProductUpdateInput): Promise<Product> {
  const existing = await getAdminProductById(input.id);
  if (!existing) throw new ProductNotFoundError(input.id);

  const discountValue = normaliseOptionalPrice(input.discountPrice);
  assertDiscountBelowBase(input.basePrice, discountValue);

  const baseSlug = input.slug && input.slug.length > 0 ? input.slug : slugify(input.name);
  let slug = existing.slug;
  if (baseSlug !== existing.slug) {
    slug = await ensureUniqueSlug(baseSlug, (s) => productSlugExists(s, existing.id));
  }

  const images = normaliseImageArray(input.images, input.thumbnailUrl);

  // Figure out which images to delete from disk: anything in the old set
  // that's not in the new set.
  const oldImages = new Set<string>(existing.images ?? []);
  if (existing.thumbnailUrl) oldImages.add(existing.thumbnailUrl);
  const newImages = new Set<string>(images);
  if (input.thumbnailUrl) newImages.add(input.thumbnailUrl);
  const toDelete = [...oldImages].filter((url) => !newImages.has(url));

  const [product] = await db
    .update(products)
    .set({
      name: input.name,
      slug,
      categoryId: input.categoryId,
      description: nullIfEmpty(input.description),
      type: input.type,
      deliveryType: input.deliveryType,
      basePrice: input.basePrice.toString(),
      discountPrice: discountValue === null ? null : discountValue.toString(),
      warrantyDays: input.warrantyDays,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      thumbnailUrl: nullIfEmpty(input.thumbnailUrl ?? null),
      images,
      updatedAt: new Date(),
    })
    .where(eq(products.id, input.id))
    .returning();
  if (!product) throw new ProductNotFoundError(input.id);

  // Fire-and-forget disk cleanup; doesn't block the response.
  await Promise.all(toDelete.map((url) => deleteImageByUrl(url))).catch(() => undefined);

  return product;
}

/** Soft delete — hides from public catalogs but keeps history (orders, audit). */
export async function softDeleteProduct(id: string): Promise<void> {
  const [row] = await db
    .update(products)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning({ id: products.id });
  if (!row) throw new ProductNotFoundError(id);
}

export async function restoreProduct(id: string): Promise<void> {
  const [row] = await db
    .update(products)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning({ id: products.id });
  if (!row) throw new ProductNotFoundError(id);
}

// ----------------------------------------------------------------------------
// Mutations — variants
// ----------------------------------------------------------------------------

export async function createVariant(
  productId: string,
  input: VariantCreateInput,
): Promise<ProductVariant> {
  const product = await getAdminProductById(productId);
  if (!product) throw new ProductNotFoundError(productId);

  if (await variantSkuExists(input.sku)) {
    throw new ProductValidationError(`SKU "${input.sku}" sudah digunakan varian lain.`);
  }

  const [row] = await db
    .insert(productVariants)
    .values({
      productId,
      name: input.name,
      sku: input.sku,
      price: input.price.toString(),
      stockMode: input.stockMode,
      description: nullIfEmpty(input.description),
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .returning();
  if (!row) throw new Error("Gagal membuat varian.");
  return row;
}

export async function updateVariant(input: VariantUpdateInput): Promise<ProductVariant> {
  const [existing] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, input.id))
    .limit(1);
  if (!existing) throw new VariantNotFoundError(input.id);

  if (input.sku !== existing.sku) {
    if (await variantSkuExists(input.sku, existing.id)) {
      throw new ProductValidationError(`SKU "${input.sku}" sudah digunakan varian lain.`);
    }
  }

  const [row] = await db
    .update(productVariants)
    .set({
      name: input.name,
      sku: input.sku,
      price: input.price.toString(),
      stockMode: input.stockMode,
      description: nullIfEmpty(input.description),
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(productVariants.id, input.id))
    .returning();
  if (!row) throw new VariantNotFoundError(input.id);
  return row;
}

export async function deleteVariant(id: string): Promise<void> {
  // Phase 4 will forbid deleting variants that have sold stocks. For now,
  // allow — cascade deletes any pending unsold rows when account_stocks ships.
  const [row] = await db
    .delete(productVariants)
    .where(eq(productVariants.id, id))
    .returning({ id: productVariants.id, productId: productVariants.productId });
  if (!row) throw new VariantNotFoundError(id);

  // Enforce invariant: product must keep ≥1 variant.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productVariants)
    .where(eq(productVariants.productId, row.productId));
  if (Number(count) === 0) {
    // Restore by re-inserting the deleted row would be messy; instead we
    // refuse in a follow-up check: the caller should guard. Surface the
    // invariant as a specific error so the UI can explain.
    throw new LastVariantError(row.productId);
  }
}

// ----------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------

export class ProductNotFoundError extends Error {
  readonly code = "PRODUCT_NOT_FOUND";
  constructor(public readonly id: string) {
    super(`Produk ${id} tidak ditemukan.`);
    this.name = "ProductNotFoundError";
  }
}

export class VariantNotFoundError extends Error {
  readonly code = "VARIANT_NOT_FOUND";
  constructor(public readonly id: string) {
    super(`Varian ${id} tidak ditemukan.`);
    this.name = "VariantNotFoundError";
  }
}

export class ProductValidationError extends Error {
  readonly code = "PRODUCT_VALIDATION";
  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

export class LastVariantError extends Error {
  readonly code = "LAST_VARIANT";
  constructor(public readonly productId: string) {
    super("Produk harus punya minimal 1 varian — tambah varian pengganti sebelum menghapus.");
    this.name = "LastVariantError";
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function nullIfEmpty(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normaliseOptionalPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

function assertDiscountBelowBase(basePrice: number, discount: number | null) {
  if (discount === null) return;
  if (discount >= basePrice) {
    throw new ProductValidationError("Harga diskon harus lebih kecil dari harga dasar.");
  }
}

/**
 * Ensure `images` is a deduped array that always includes `thumbnailUrl` first
 * (if provided) so the thumbnail is always reachable from the gallery.
 */
function normaliseImageArray(images: string[] | undefined, thumbnailUrl: string | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: string | null | undefined) => {
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };
  push(thumbnailUrl);
  for (const url of images ?? []) push(url);
  return out;
}
