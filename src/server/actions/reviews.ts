"use server";

import { revalidatePath } from "next/cache";

import { createReviewSchema } from "@/lib/schemas/reviews";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireUser } from "@/server/auth";
import { createReviewForOrderItem, ReviewError } from "@/server/services/reviews";

export async function createReviewAction(
  input: unknown,
): Promise<ActionResult<{ reviewId: string }>> {
  const user = await requireUser("/dashboard/reviews");
  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data review tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const result = await createReviewForOrderItem({
      userId: user.id,
      orderItemId: parsed.data.orderItemId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    revalidatePath("/dashboard/reviews");
    revalidatePath(`/products/${result.productSlug}`);
    return actionOk({ reviewId: result.review.id });
  } catch (error) {
    if (error instanceof ReviewError) {
      return actionError(error.message, { code: error.code });
    }
    console.error("[createReviewAction]", error);
    return actionError("Gagal menyimpan review.");
  }
}

