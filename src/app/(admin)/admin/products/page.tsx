import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIdr } from "@/lib/price";
import { listCategoriesWithCounts } from "@/server/queries/categories";
import { listAdminProducts } from "@/server/queries/products";

import { ProductRowActions } from "./product-row-actions";
import { ProductsFilterBar } from "./products-filter-bar";

export const metadata: Metadata = {
  title: "Admin · Produk",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  categoryId?: string;
  type?: "account" | "service";
  includeDeleted?: string;
  page?: string;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;

  const [{ items, total, totalPages, pageSize }, categories] = await Promise.all([
    listAdminProducts({
      search: sp.search,
      categoryId: sp.categoryId || undefined,
      type: sp.type,
      includeDeleted: sp.includeDeleted === "1",
      page,
      pageSize: 20,
    }),
    listCategoriesWithCounts(),
  ]);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Produk</h1>
          <p className="text-muted-foreground text-sm">
            Kelola produk marketplace. Soft-delete menyembunyikan produk dari katalog tanpa
            menghilangkan riwayat order.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/products/new">+ Produk baru</Link>} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar produk</CardTitle>
          <CardDescription>
            {total === 0
              ? "Tidak ada produk yang cocok."
              : `Menampilkan ${startIdx}–${endIdx} dari ${total} produk.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProductsFilterBar
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            initial={{
              search: sp.search ?? "",
              categoryId: sp.categoryId ?? "",
              type: sp.type ?? "",
              includeDeleted: sp.includeDeleted === "1",
            }}
          />

          {items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Belum ada produk. Klik &ldquo;Produk baru&rdquo; untuk membuat.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Varian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="block font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <div className="text-muted-foreground font-mono text-xs">
                        /{product.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{product.categoryName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {product.discountPrice ? (
                        <>
                          <div>{formatIdr(product.discountPrice)}</div>
                          <div className="text-muted-foreground text-xs line-through">
                            {formatIdr(product.basePrice)}
                          </div>
                        </>
                      ) : (
                        formatIdr(product.basePrice)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {product.variantCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.deletedAt ? (
                          <Badge variant="destructive">dihapus</Badge>
                        ) : product.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                            aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline">nonaktif</Badge>
                        )}
                        {product.isFeatured ? <Badge>unggulan</Badge> : null}
                        <Badge variant="outline">{product.type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductRowActions
                        id={product.id}
                        name={product.name}
                        deleted={!!product.deletedAt}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              searchParams={sp as Record<string, string | undefined>}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) base.set(k, v);
  }

  function link(p: number) {
    const sp = new URLSearchParams(base);
    sp.set("page", String(p));
    return `/admin/products?${sp.toString()}`;
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        disabled={page <= 1}
        render={<Link href={page > 1 ? link(page - 1) : "#"}>Sebelumnya</Link>}
      />
      <span className="text-muted-foreground text-xs">
        Halaman {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        disabled={page >= totalPages}
        render={<Link href={page < totalPages ? link(page + 1) : "#"}>Berikutnya</Link>}
      />
    </div>
  );
}
