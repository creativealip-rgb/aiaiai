import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { categories, products } from "@/db/schema";

export async function listSeoCategories() {
  return db
    .select({
      slug: categories.slug,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .where(eq(categories.isActive, true));
}

export async function listSeoProducts() {
  return db
    .select({
      slug: products.slug,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(
      and(eq(products.isActive, true), isNull(products.deletedAt)),
    );
}

