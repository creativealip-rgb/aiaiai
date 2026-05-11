"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import { recordAdminAction } from "@/server/services/admin-audit";
import { ReviewError, setReviewHidden } from "@/server/services/reviews";

export async function setReviewHiddenAction(
  reviewId: string,
  isHidden: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!reviewId) return actionError("Review tidak valid.");

  try {
    const row = await setReviewHidden(reviewId, isHidden);
    try {
      await recordAdminAction({
        actorId: admin.id,
        action: isHidden ? "review.hide" : "review.unhide",
        entityType: "review",
        entityId: reviewId,
        diff: { isHidden: row.isHidden },
      });
    } catch (error) {
      console.error("[setReviewHiddenAction] audit log failed", error);
    }

    revalidatePath("/admin/reviews");
    revalidatePath(`/products/${row.productSlug}`);
    return actionOk(undefined);
  } catch (error) {
    if (error instanceof ReviewError) {
      return actionError(error.message, { code: error.code });
    }
    console.error("[setReviewHiddenAction]", error);
    return actionError("Gagal memperbarui review.");
  }
}
