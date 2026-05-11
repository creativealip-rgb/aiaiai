import "server-only";

/**
 * Read-side queries for categories. Kept separate from the service layer so
 * Server Components can import these without pulling in any `"use server"` /
 * mutation code.
 */

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products, type Category } from "@/db/schema";

/** All active categories, ordered for nav / filter menus. */
export async function listActiveCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export type CategoryWithCount = Category & { productCount: number };

/**
 * Admin listing: every category + a count of its non-deleted products.
 * Ordered by `sortOrder`, then name.
 *
 * Left join so empty categories still show up with `productCount = 0`.
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      description: categories.description,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      productCount: sql<number>`count(${products.id}) filter (where ${products.deletedAt} is null)`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return rows;
}

/** Look up a single category by slug (public catalog). */
export async function getActiveCategoryBySlug(slug: string): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);
  return row ?? null;
}

/** Admin: look up any category (active or not). */
export async function getCategoryById(id: string): Promise<Category | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

/** True if a slug is already in use, optionally excluding one id (for updates). */
export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(2);
  if (rows.length === 0) return false;
  if (!excludeId) return true;
  return rows.some((r) => r.id !== excludeId);
}
