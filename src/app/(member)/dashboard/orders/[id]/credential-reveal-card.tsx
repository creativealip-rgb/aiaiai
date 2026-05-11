"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { revealOrderItemCredentialAction } from "@/server/actions/orders";
import { Button } from "@/components/ui/button";

export function CredentialRevealCard({
  orderItemId,
}: {
  orderItemId: string;
}) {
  const [credential, setCredential] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleReveal() {
    startTransition(async () => {
      const res = await revealOrderItemCredentialAction(orderItemId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCredential(res.data.credential);
    });
  }

  async function handleCopy() {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential);
      toast.success("Kredensial disalin.");
    } catch {
      toast.error("Gagal menyalin.");
    }
  }

  return (
    <div className="space-y-2">
      {credential ? (
        <>
          <pre className="bg-muted overflow-x-auto rounded-md border p-3 text-xs whitespace-pre-wrap">
            {credential}
          </pre>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            Salin kredensial
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={handleReveal} disabled={pending}>
          {pending ? "Memuat..." : "Tampilkan kredensial"}
        </Button>
      )}
    </div>
  );
}

