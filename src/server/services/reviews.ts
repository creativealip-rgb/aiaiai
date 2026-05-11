import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, products, reviews } from "@/db/schema";
import { createNotification } from "@/server/services/notifications";

const REVIEWABLE_STATUSES = ["partial_delivered", "delivered"] as const;

export class ReviewError extends Error {
  readonly code: string;
  constructor(message: string, code = "REVIEW_ERROR") {
    super(message);
    this.name = "ReviewError";
    this.code = code;
  }
}

export async function createReviewForOrderItem(input: {
  userId: string;
  orderItemId: string;
  rating: number;
  comment?: string;
}) {
  const [eligible] = await db
    .select({
      orderItemId: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      productSlug: products.slug,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      existingReviewId: reviews.id,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(reviews, eq(reviews.orderItemId, orderItems.id))
    .where(
      and(
        eq(orderItems.id, input.orderItemId),
        eq(orders.userId, input.userId),
        inArray(orders.status, REVIEWABLE_STATUSES),
        sql`${orderItems.deliveredAt} is not null`,
      ),
    )
    .limit(1);

  if (!eligible) {
    throw new ReviewError("Item order belum memenuhi syarat untuk direview.", "NOT_ELIGIBLE");
  }
  if (eligible.existingReviewId) {
    throw new ReviewError("Item order ini sudah pernah direview.", "ALREADY_REVIEWED");
  }

  const [row] = await db
    .insert(reviews)
    .values({
      userId: input.userId,
      productId: eligible.productId,
      orderItemId: eligible.orderItemId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    })
    .returning();

  if (!row) {
    throw new ReviewError("Gagal menyimpan review.");
  }

  await recomputeProductRating(eligible.productId);

  try {
    await createNotification({
      userId: input.userId,
      type: "review_created",
      title: "Review berhasil dikirim",
      message: `Terima kasih! Review untuk ${eligible.productName} sudah tersimpan.`,
      linkUrl: `/products/${eligible.productSlug}`,
    });
  } catch (error) {
    console.error("[createReviewForOrderItem] notification failed", error);
  }

  return { review: row, productSlug: eligible.productSlug };
}

export async function setReviewHidden(
  reviewId: string,
  isHidden: boolean,
): Promise<{ id: string; productId: string; productSlug: string; isHidden: boolean }> {
  const [existing] = await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      productSlug: products.slug,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  if (!existing) {
    throw new ReviewError("Review tidak ditemukan.", "NOT_FOUND");
  }

  const [row] = await db
    .update(reviews)
    .set({
      isHidden,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning({
      id: reviews.id,
      productId: reviews.productId,
      isHidden: reviews.isHidden,
    });

  if (!row) {
    throw new ReviewError("Review tidak ditemukan.", "NOT_FOUND");
  }

  await recomputeProductRating(row.productId);
  return {
    id: row.id,
    productId: row.productId,
    productSlug: existing.productSlug,
    isHidden: row.isHidden,
  };
}

export async function recomputeProductRating(productId: string): Promise<void> {
  const [agg] = await db
    .select({
      ratingCount: sql<number>`count(*)::int`,
      ratingAvg:
        sql<string>`coalesce(round(avg(${reviews.rating})::numeric, 2), 0)::text`,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isHidden, false)));

  await db
    .update(products)
    .set({
      ratingCount: Number(agg?.ratingCount ?? 0),
      ratingAvg: String(agg?.ratingAvg ?? "0"),
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
}
