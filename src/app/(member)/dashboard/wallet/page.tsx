import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIdr } from "@/lib/price";
import { requireUser } from "@/server/auth";
import {
  listWalletTopupsByUser,
  listWalletTransactionsByUser,
} from "@/server/services/wallet";

import { WalletTopupForm } from "./wallet-topup-form";

export const metadata: Metadata = {
  title: "Dashboard · Wallet",
};

export const dynamic = "force-dynamic";

export default async function DashboardWalletPage() {
  const user = await requireUser("/dashboard/wallet");
  const [topups, transactions] = await Promise.all([
    listWalletTopupsByUser(user.id),
    listWalletTransactionsByUser(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground text-sm">Top up saldo dan lihat riwayat transaksi wallet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo saat ini: {formatIdr(user.balance ?? "0")}</CardTitle>
        </CardHeader>
        <CardContent>
          <WalletTopupForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat top up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada top up.</p>
          ) : (
            topups.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{formatIdr(row.amount)}</div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(row.createdAt).toLocaleString("id-ID")}
                  </div>
                </div>
                <Badge variant={row.status === "paid" ? "default" : "outline"}>{row.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat wallet transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada transaksi wallet.</p>
          ) : (
            transactions.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {row.type} · {formatIdr(row.amount)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    saldo akhir: {formatIdr(row.balanceAfter)} ·{" "}
                    {new Date(row.createdAt).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

