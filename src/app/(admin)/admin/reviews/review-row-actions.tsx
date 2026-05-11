"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setReviewHiddenAction } from "@/server/actions/admin/reviews";

export function ReviewRowActions({ reviewId, isHidden }: { reviewId: string; isHidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await setReviewHiddenAction(reviewId, !isHidden);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isHidden ? "Review ditampilkan." : "Review disembunyikan.");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant={isHidden ? "outline" : "secondary"} disabled={pending} onClick={toggle}>
      {pending ? "Memproses..." : isHidden ? "Unhide" : "Hide"}
    </Button>
  );
}

