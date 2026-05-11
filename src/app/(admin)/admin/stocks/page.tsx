import type { Metadata } from "next";

import { StocksManager } from "./stocks-manager";
import { listAdminStocks, listTrackedVariantsForStockAdmin } from "@/server/services/stocks";

export const metadata: Metadata = {
  title: "Admin · Stok Akun",
};

export const dynamic = "force-dynamic";

export default async function AdminStocksPage() {
  const [stocks, variants] = await Promise.all([
    listAdminStocks({ page: 1, pageSize: 50 }),
    listTrackedVariantsForStockAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stok akun</h1>
        <p className="text-muted-foreground text-sm">
          Kelola inventori credential untuk varian tracked.
        </p>
      </div>
      <StocksManager initialStocks={stocks.items} variants={variants} />
    </div>
  );
}

