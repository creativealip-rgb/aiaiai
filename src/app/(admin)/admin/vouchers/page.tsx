import type { Metadata } from "next";

import { listVouchers } from "@/server/services/vouchers";

import { VouchersManager } from "./vouchers-manager";

export const metadata: Metadata = {
  title: "Admin · Vouchers",
};

export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  const vouchers = await listVouchers();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Vouchers</h1>
        <p className="text-muted-foreground text-sm">
          Kelola kode promo untuk checkout member/guest.
        </p>
      </div>
      <VouchersManager initialVouchers={vouchers} />
    </div>
  );
}

