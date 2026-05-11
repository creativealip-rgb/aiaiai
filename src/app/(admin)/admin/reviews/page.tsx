import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminReviews } from "@/server/queries/reviews";

import { ReviewRowActions } from "./review-row-actions";

export const metadata: Metadata = {
  title: "Admin · Reviews",
};

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ hidden?: string }>;
}) {
  const params = await searchParams;
  const hidden = params.hidden === "hidden" || params.hidden === "visible" ? params.hidden : "all";
  const rows = await listAdminReviews({ hidden });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          Moderasi ulasan produk, termasuk hide/unhide.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="hidden">
                Status review
              </label>
              <select
                id="hidden"
                name="hidden"
                defaultValue={hidden}
                className="border-input bg-background h-9 min-w-56 rounded-md border px-3 text-sm"
              >
                <option value="all">Semua</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              Terapkan
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar review ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">Produk</th>
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 pr-3 font-medium">Rating</th>
                    <th className="py-2 pr-3 font-medium">Komentar</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Waktu</th>
                    <th className="py-2 pr-0 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium">{row.productName}</div>
                        <div className="text-muted-foreground text-xs">{row.orderNumber}</div>
                        <Link className="text-xs underline" href={`/products/${row.productSlug}`} target="_blank">
                          Buka produk
                        </Link>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium">{row.userName || "-"}</div>
                        <div className="text-muted-foreground text-xs">{row.userEmail}</div>
                      </td>
                      <td className="py-3 pr-3 align-top">{row.rating}/5</td>
                      <td className="py-3 pr-3 align-top">
                        <p className="line-clamp-2 max-w-sm text-xs">{row.comment || "-"}</p>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <Badge variant={row.isHidden ? "secondary" : "outline"}>
                          {row.isHidden ? "hidden" : "visible"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 align-top text-xs">
                        {new Date(row.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-0 align-top text-right">
                        <ReviewRowActions reviewId={row.id} isHidden={row.isHidden} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

