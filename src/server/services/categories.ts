import "server-only";

/**
 * Category service — business logic for category CRUD. Pure functions that
 * operate on the DB; no Next.js / framework imports so these can be unit
 * tested against Testcontainers Postgres later.
 *
 * Zod schemas live in `@/lib/schemas/categories` so client code (admin forms)
 * can import them without pulling in this server-only module.
 */

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, type Category } from "@/db/schema";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
  type CategoryUpdateInput,
} from "@/lib/schemas/categories";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import { slugExists, getCategoryById } from "@/server/queries/categories";
import { countProductsInCategory } from "@/server/queries/products";

// Re-export for action / route consumers that were previously importing from
// this file.
export { categoryCreateSchema, categoryUpdateSchema };
export type { CategoryCreateInput, CategoryUpdateInput };

// ----------------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------------

export async function createCategory(input: CategoryCreateInput): Promise<Category> {
  const baseSlug = input.slug && input.slug.length > 0 ? input.slug : slugify(input.name);
  const slug = await ensureUniqueSlug(baseSlug, (s) => slugExists(s));

  const [row] = await db
    .insert(categories)
    .values({
      name: input.name,
      slug,
      icon: nullIfEmpty(input.icon),
      description: nullIfEmpty(input.description),
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .returning();
  if (!row) throw new Error("Gagal membuat kategori.");
  return row;
}

export async function updateCategory(input: CategoryUpdateInput): Promise<Category> {
  const existing = await getCategoryById(input.id);
  if (!existing) throw new CategoryNotFoundError(input.id);

  const desiredBaseSlug =
    input.slug && input.slug.length > 0 ? input.slug : slugify(input.name);
  // Only recompute if the requested slug differs from current.
  let slug = existing.slug;
  if (desiredBaseSlug !== existing.slug) {
    slug = await ensureUniqueSlug(desiredBaseSlug, (s) => slugExists(s, existing.id));
  }

  const [row] = await db
    .update(categories)
    .set({
      name: input.name,
      slug,
      icon: nullIfEmpty(input.icon),
      description: nullIfEmpty(input.description),
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, input.id))
    .returning();
  if (!row) throw new CategoryNotFoundError(input.id);
  return row;
}

/**
 * Hard delete a category. Refuses when products (including soft-deleted)
 * still reference it — the FK is `on delete restrict`.
 *
 * The typical admin flow is: deactivate (soft-hide) instead of delete.
 */
export async function deleteCategory(id: string): Promise<void> {
  const existing = await getCategoryById(id);
  if (!existing) throw new CategoryNotFoundError(id);

  const productCount = await countProductsInCategory(id);
  if (productCount > 0) {
    throw new CategoryInUseError(id, productCount);
  }

  await db.delete(categories).where(eq(categories.id, id));
}

// ----------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------

export class CategoryNotFoundError extends Error {
  readonly code = "CATEGORY_NOT_FOUND";
  constructor(public readonly id: string) {
    super(`Kategori ${id} tidak ditemukan.`);
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryInUseError extends Error {
  readonly code = "CATEGORY_IN_USE";
  constructor(public readonly id: string, public readonly productCount: number) {
    super(`Kategori masih dipakai oleh ${productCount} produk — hapus atau pindahkan produk dulu.`);
    this.name = "CategoryInUseError";
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
