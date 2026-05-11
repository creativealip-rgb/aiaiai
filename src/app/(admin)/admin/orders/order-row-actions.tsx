"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelOrderAction, markOrderDeliveredAction, refundOrderAction } from "@/server/actions/admin/orders";
import type { OrderStatus } from "@/db/schema";

export function OrderRowActions({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const canDeliver = status === "paid" || status === "processing" || status === "partial_delivered";
  const canCancel = status === "pending" || status === "processing";
  const canRefund = status === "paid" || status === "processing" || status === "partial_delivered" || status === "delivered";

  function run(
    confirmText: string,
    task: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ) {
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      const res = await task();
      if (!res.ok) {
        toast.error(res.error ?? "Aksi gagal.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canDeliver ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              `Tandai order ${orderNumber} sebagai delivered?`,
              () => markOrderDeliveredAction(orderId),
              "Order ditandai delivered.",
            )
          }
        >
          Deliver
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              `Batalkan order ${orderNumber}?`,
              () => cancelOrderAction(orderId),
              "Order dibatalkan.",
            )
          }
        >
          Cancel
        </Button>
      ) : null}
      {canRefund ? (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            run(
              `Refund order ${orderNumber}?`,
              () => refundOrderAction(orderId),
              "Order direfund.",
            )
          }
        >
          Refund
        </Button>
      ) : null}
    </div>
  );
}

