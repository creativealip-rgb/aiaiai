import "server-only";

/**
 * Read-side queries for products. Deliberately kept independent of
 * Server Actions / mutations so Server Components can import them cheaply.
 *
 * Public-facing queries (catalog, detail) filter out soft-deleted and
 * inactive rows. Admin-facing ones (`listAllProductsAdmin`) include
 * everything.
 */

import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  products,
  productVariants,
  type Category,
  type Product,
  type ProductType,
  type ProductVariant,
} from "@/db/schema";

// ----------------------------------------------------------------------------
// Public: catalog listing
// ----------------------------------------------------------------------------

export type PublicProductCard = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "thumbnailUrl"
  | "basePrice"
  | "discountPrice"
  | "type"
  | "soldCount"
  | "ratingAvg"
  | "ratingCount"
  | "warrantyDays"
  | "isFeatured"
> & {
  categoryName: string;
  categorySlug: string;
};

export type ProductSort = "newest" | "popular" | "price_asc" | "price_desc";

export type ListProductsInput = {
  search?: string;
  categorySlug?: string;
  type?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

export type ListProductsResult = {
  items: PublicProductCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE_DEFAULT = 12;
const PAGE_SIZE_MAX = 48;

/**
 * Public catalog listing. Always excludes deleted / inactive rows.
 *
 * Price filters compare against `coalesce(discount_price, base_price)` so
 * "min 50.000" hides products whose effective price is below that even
 * when their list price is higher.
 */
export async function listPublicProducts(input: ListProductsInput = {}): Promise<ListProductsResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Math.floor(input.pageSize ?? PAGE_SIZE_DEFAULT)));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(products.isActive, true), isNull(products.deletedAt)];

  if (input.search && input.search.trim()) {
    const q = `%${input.search.trim()}%`;
    const like = or(ilike(products.name, q), ilike(products.description, q));
    if (like) conditions.push(like);
  }

  if (input.categorySlug) {
    conditions.push(eq(categories.slug, input.categorySlug));
  }

  if (input.type) {
    conditions.push(eq(products.type, input.type));
  }

  const effectivePrice = sql<string>`coalesce(${products.discountPrice}, ${products.basePrice})`;
  if (typeof input.minPrice === "number" && Number.isFinite(input.minPrice)) {
    conditions.push(gte(effectivePrice, input.minPrice.toString()));
  }
  if (typeof input.maxPrice === "number" && Number.isFinite(input.maxPrice)) {
    conditions.push(lte(effectivePrice, input.maxPrice.toString()));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  let orderBy;
  switch (input.sort) {
    case "popular":
      orderBy = [desc(products.soldCount), desc(products.createdAt)];
      break;
    case "price_asc":
      orderBy = [asc(effectivePrice), desc(products.createdAt)];
      break;
    case "price_desc":
      orderBy = [desc(effectivePrice), desc(products.createdAt)];
      break;
    case "newest":
    default:
      orderBy = [desc(products.createdAt)];
      break;
  }

  const [items, [{ count }]] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        thumbnailUrl: products.thumbnailUrl,
        basePrice: products.basePrice,
        discountPrice: products.discountPrice,
        type: products.type,
        soldCount: products.soldCount,
        ratingAvg: products.ratingAvg,
        ratingCount: products.ratingCount,
        warrantyDays: products.warrantyDays,
        isFeatured: products.isFeatured,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where),
  ]);

  return {
    items,
    total: Number(count ?? 0),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(count ?? 0) / pageSize)),
  };
}

// ----------------------------------------------------------------------------
// Public: featured products (landing page)
// ----------------------------------------------------------------------------

export async function listFeaturedProducts(limit = 8): Promise<PublicProductCard[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      thumbnailUrl: products.thumbnailUrl,
      basePrice: products.basePrice,
      discountPrice: products.discountPrice,
      type: products.type,
      soldCount: products.soldCount,
      ratingAvg: products.ratingAvg,
      ratingCount: products.ratingCount,
      warrantyDays: products.warrantyDays,
      isFeatured: products.isFeatured,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.isActive, true),
        eq(products.isFeatured, true),
        isNull(products.deletedAt),
      ),
    )
    .orderBy(desc(products.soldCount), desc(products.createdAt))
    .limit(limit);
}

// ----------------------------------------------------------------------------
// Public: detail
// ----------------------------------------------------------------------------

export type ProductDetail = Product & {
  category: Category;
  variants: ProductVariant[];
};

export async function getActiveProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [row] = await db
    .select({
      product: products,
      category: categories,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.slug, slug),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, row.product.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.price));

  return { ...row.product, category: row.category, variants };
}

/** Related products: same category, different id, ordered by popularity. */
export async function listRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<PublicProductCard[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      thumbnailUrl: products.thumbnailUrl,
      basePrice: products.basePrice,
      discountPrice: products.discountPrice,
      type: products.type,
      soldCount: products.soldCount,
      ratingAvg: products.ratingAvg,
      ratingCount: products.ratingCount,
      warrantyDays: products.warrantyDays,
      isFeatured: products.isFeatured,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(
      and(
        eq(products.categoryId, categoryId),
        ne(products.id, productId),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    )
    .orderBy(desc(products.soldCount), desc(products.createdAt))
    .limit(limit);
}

// ----------------------------------------------------------------------------
// Admin
// ----------------------------------------------------------------------------

export type AdminProductRow = Product & {
  categoryName: string;
  categorySlug: string;
  variantCount: number;
};

export type ListAdminProductsInput = {
  search?: string;
  categoryId?: string;
  type?: ProductType;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListAdminProductsResult = {
  items: AdminProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listAdminProducts(
  input: ListAdminProductsInput = {},
): Promise<ListAdminProductsResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize ?? 20)));
  const offset = (page - 1) * pageSize;

  const conditions = [] as ReturnType<typeof eq>[];
  if (!input.includeDeleted) conditions.push(isNull(products.deletedAt));
  if (input.search && input.search.trim()) {
    const q = `%${input.search.trim()}%`;
    const like = or(ilike(products.name, q), ilike(products.slug, q));
    if (like) conditions.push(like);
  }
  if (input.categoryId) conditions.push(eq(products.categoryId, input.categoryId));
  if (input.type) conditions.push(eq(products.type, input.type));
  const where = conditions.length === 0 ? undefined : and(...conditions);

  const [items, [{ count }]] = await Promise.all([
    db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        thumbnailUrl: products.thumbnailUrl,
        images: products.images,
        type: products.type,
        basePrice: products.basePrice,
        discountPrice: products.discountPrice,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        deliveryType: products.deliveryType,
        warrantyDays: products.warrantyDays,
        meta: products.meta,
        soldCount: products.soldCount,
        ratingAvg: products.ratingAvg,
        ratingCount: products.ratingCount,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        deletedAt: products.deletedAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
        variantCount:
          sql<number>`(select count(*) from ${productVariants} where ${productVariants.productId} = ${products.id})`.mapWith(
            Number,
          ),
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where ?? sql`true`),
  ]);

  return {
    items,
    total: Number(count ?? 0),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(count ?? 0) / pageSize)),
  };
}

export async function getAdminProductById(id: string): Promise<ProductDetail | null> {
  const [row] = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.id, id))
    .limit(1);
  if (!row) return null;

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, row.product.id))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.price));

  return { ...row.product, category: row.category, variants };
}

export async function productSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(2);
  if (rows.length === 0) return false;
  if (!excludeId) return true;
  return rows.some((r) => r.id !== excludeId);
}

export async function variantSkuExists(sku: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.sku, sku))
    .limit(2);
  if (rows.length === 0) return false;
  if (!excludeId) return true;
  return rows.some((r) => r.id !== excludeId);
}

/** Count products assigned to a category (including deleted). Used to guard category delete. */
export async function countProductsInCategory(categoryId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, categoryId));
  return Number(count ?? 0);
}

/** Fetch a map of categoryId → Category for lightweight lookups. */
export async function mapCategoriesByIds(ids: string[]): Promise<Map<string, Category>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(categories).where(inArray(categories.id, ids));
  const map = new Map<string, Category>();
  for (const row of rows) map.set(row.id, row);
  return map;
}
