"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  restoreProductAction,
  softDeleteProductAction,
} from "@/server/actions/admin/products";

export function ProductRowActions({
  id,
  name,
  deleted,
}: {
  id: string;
  name: string;
  deleted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(`Soft-delete produk "${name}"? Produk akan disembunyikan dari katalog.`)) {
      return;
    }
    startTransition(async () => {
      const res = await softDeleteProductAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Produk di-soft-delete.");
      router.refresh();
    });
  }

  function onRestore() {
    startTransition(async () => {
      const res = await restoreProductAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Produk dipulihkan.");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${name}`} type="button">
            <MoreHorizontalIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/admin/products/${id}`}>Edit</Link>}
        />
        {deleted ? (
          <DropdownMenuItem disabled={pending} onClick={onRestore}>
            Pulihkan
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={pending} onClick={onDelete}>
            Soft delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
