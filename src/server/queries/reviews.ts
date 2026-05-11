import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, products, reviews, users } from "@/db/schema";

const REVIEWABLE_STATUSES = ["partial_delivered", "delivered"] as const;

export type MemberReviewRow = {
  orderItemId: string;
  orderNumber: string;
  deliveredAt: Date;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  reviewId: string | null;
  rating: number | null;
  comment: string | null;
  isHidden: boolean | null;
  reviewedAt: Date | null;
};

export async function listMemberReviews(userId: string): Promise<MemberReviewRow[]> {
  const rows = await db
    .select({
      orderItemId: orderItems.id,
      productSnapshot: orderItems.productSnapshot,
      orderNumber: orders.orderNumber,
      deliveredAt: orderItems.deliveredAt,
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      reviewId: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      isHidden: reviews.isHidden,
      reviewedAt: reviews.createdAt,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(reviews, eq(reviews.orderItemId, orderItems.id))
    .where(
      and(
        eq(orders.userId, userId),
        inArray(orders.status, REVIEWABLE_STATUSES),
        sql`${orderItems.deliveredAt} is not null`,
      ),
    )
    .orderBy(desc(orderItems.deliveredAt), desc(orderItems.createdAt));

  return rows.map((row) => {
    const snapshot = row.productSnapshot as { variantName?: string } | null;
    return {
      orderItemId: row.orderItemId,
      orderNumber: row.orderNumber,
      deliveredAt: row.deliveredAt ?? row.reviewedAt ?? new Date(),
      productId: row.productId,
      productSlug: row.productSlug,
      productName: row.productName,
      variantName: snapshot?.variantName ?? "Varian",
      reviewId: row.reviewId,
      rating: row.rating,
      comment: row.comment,
      isHidden: row.isHidden,
      reviewedAt: row.reviewedAt,
    };
  });
}

export type AdminReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: Date;
  orderNumber: string;
  productId: string;
  productName: string;
  productSlug: string;
  userId: string;
  userEmail: string;
  userName: string;
};

export async function listAdminReviews(filters?: { hidden?: "all" | "hidden" | "visible" }) {
  const hidden = filters?.hidden ?? "all";

  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      isHidden: reviews.isHidden,
      createdAt: reviews.createdAt,
      orderNumber: orders.orderNumber,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      userId: users.id,
      userEmail: users.email,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(orderItems, eq(orderItems.id, reviews.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(
      hidden === "all"
        ? undefined
        : hidden === "hidden"
          ? eq(reviews.isHidden, true)
          : eq(reviews.isHidden, false),
    )
    .orderBy(desc(reviews.createdAt));
}

export async function listVisibleReviewsByProduct(
  productId: string,
  limit = 20,
): Promise<
  Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    userName: string;
  }>
> {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, productId), eq(reviews.isHidden, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));
}

