"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resetUserPasswordAction, setUserBanStatusAction } from "@/server/actions/admin/users";

export function UserActions({
  userId,
  userEmail,
  isBanned,
  compact = false,
}: {
  userId: string;
  userEmail: string;
  isBanned: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleBanToggle() {
    const next = !isBanned;
    const label = next ? "ban" : "unban";
    if (!confirm(`${label.toUpperCase()} user ${userEmail}?`)) return;

    startTransition(async () => {
      const res = await setUserBanStatusAction(userId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(next ? "User diban." : "User diaktifkan kembali.");
      router.refresh();
    });
  }

  function handleResetPassword() {
    if (!confirm(`Reset password user ${userEmail}?`)) return;
    startTransition(async () => {
      const res = await resetUserPasswordAction(userId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      const pwd = res.data.temporaryPassword;
      try {
        await navigator.clipboard.writeText(pwd);
        toast.success(`Password sementara: ${pwd} (sudah disalin).`);
      } catch {
        toast.success(`Password sementara: ${pwd}`);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size={compact ? "sm" : "default"}
        variant={isBanned ? "outline" : "destructive"}
        disabled={pending}
        onClick={handleBanToggle}
      >
        {isBanned ? "Unban" : "Ban"}
      </Button>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        disabled={pending}
        onClick={handleResetPassword}
      >
        Reset password
      </Button>
    </div>
  );
}

