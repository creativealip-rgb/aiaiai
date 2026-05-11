"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWalletTopupAction } from "@/server/actions/wallet";

export function WalletTopupForm() {
  const [amount, setAmount] = useState("100000");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createWalletTopupAction({ amount: Number(amount || "0") });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Invoice top up dibuat. Mengarahkan ke pembayaran...");
      window.location.assign(res.data.paymentUrl);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nominal top up</label>
        <Input
          type="number"
          min={10000}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-48"
        />
      </div>
      <Button disabled={pending} onClick={submit}>
        {pending ? "Membuat..." : "Top up via Mayar"}
      </Button>
    </div>
  );
}

