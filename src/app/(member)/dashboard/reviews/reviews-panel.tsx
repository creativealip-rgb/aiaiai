"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createReviewAction } from "@/server/actions/reviews";
import type { MemberReviewRow } from "@/server/queries/reviews";

type DraftMap = Record<string, { rating: string; comment: string }>;

function defaultDraft(): { rating: string; comment: string } {
  return { rating: "5", comment: "" };
}

export function ReviewsPanel({ items }: { items: MemberReviewRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<DraftMap>({});

  const pendingItems = items.filter((item) => !item.reviewId);
  const reviewedItems = items.filter((item) => !!item.reviewId);

  function setDraft(orderItemId: string, patch: Partial<{ rating: string; comment: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [orderItemId]: { ...(prev[orderItemId] ?? defaultDraft()), ...patch },
    }));
  }

  function getDraft(orderItemId: string) {
    return drafts[orderItemId] ?? defaultDraft();
  }

  function submitReview(orderItemId: string) {
    const draft = getDraft(orderItemId);
    startTransition(async () => {
      const res = await createReviewAction({
        orderItemId,
        rating: Number(draft.rating || "0"),
        comment: draft.comment,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Review berhasil dikirim.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Belum direview ({pendingItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada item yang menunggu review.</p>
          ) : (
            pendingItems.map((item) => {
              const draft = getDraft(item.orderItemId);
              return (
                <div key={item.orderItemId} className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.variantName} · {item.orderNumber}
                      </p>
                    </div>
                    <Link className="text-xs underline" href={`/products/${item.productSlug}`}>
                      Buka produk
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Rating</label>
                      <select
                        value={draft.rating}
                        onChange={(e) => setDraft(item.orderItemId, { rating: e.target.value })}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>
                            {value} bintang
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Komentar (opsional)</label>
                      <Input
                        value={draft.comment}
                        onChange={(e) => setDraft(item.orderItemId, { comment: e.target.value })}
                        placeholder="Bagaimana pengalaman Anda?"
                        maxLength={1000}
                      />
                    </div>
                  </div>

                  <Button disabled={pending} onClick={() => submitReview(item.orderItemId)}>
                    {pending ? "Menyimpan..." : "Kirim review"}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review saya ({reviewedItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewedItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada review yang tersimpan.</p>
          ) : (
            reviewedItems.map((item) => (
              <div key={item.orderItemId} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.variantName} · {item.orderNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.rating}/5</Badge>
                    {item.isHidden ? <Badge variant="secondary">disembunyikan admin</Badge> : null}
                  </div>
                </div>
                {item.comment ? <p className="text-sm">{item.comment}</p> : null}
                <p className="text-muted-foreground text-xs">
                  {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString("id-ID") : "-"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

