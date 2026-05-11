import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCredentialAccessLogs, listRecentAdminActionLogs } from "@/server/queries/audit";

export const metadata: Metadata = {
  title: "Admin · Audit Log",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  search?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const from = sp.from ? parseYmdToDate(sp.from) : undefined;
  const to = sp.to ? parseYmdToDateEnd(sp.to) : undefined;

  const [{ items, total, totalPages, pageSize }, adminItems] = await Promise.all([
    listCredentialAccessLogs({
      search: sp.search,
      from,
      to,
      page,
      pageSize: 30,
    }),
    listRecentAdminActionLogs(80),
  ]);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log kredensial</h1>
        <p className="text-muted-foreground text-sm">
          Rekam jejak akses member saat membuka kredensial akun.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto]">
            <Input
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Cari email / order number / action"
            />
            <Input name="from" type="date" defaultValue={sp.from ?? ""} />
            <Input name="to" type="date" defaultValue={sp.to ?? ""} />
            <Button type="submit">Terapkan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit aksi admin</CardTitle>
          <CardDescription>Rekam jejak aksi sensitif (order/user).</CardDescription>
        </CardHeader>
        <CardContent>
          {adminItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada log aksi admin.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Diff</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.createdAt).toLocaleString("id-ID")}</TableCell>
                    <TableCell>{item.actorEmail}</TableCell>
                    <TableCell>{item.action}</TableCell>
                    <TableCell>
                      {item.entityType}
                      {item.entityId ? `:${item.entityId}` : ""}
                    </TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal text-xs">
                      {item.diff ? JSON.stringify(item.diff) : "-"}
                    </TableCell>
                    <TableCell>{item.ipAddress ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log akses</CardTitle>
          <CardDescription>
            {total === 0
              ? "Belum ada log."
              : `Menampilkan ${startIdx}-${endIdx} dari ${total} log.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Belum ada data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.createdAt).toLocaleString("id-ID")}</TableCell>
                    <TableCell>{item.userEmail}</TableCell>
                    <TableCell>{item.orderNumber}</TableCell>
                    <TableCell className="whitespace-normal">
                      {item.productName} · {item.variantName}
                    </TableCell>
                    <TableCell>{item.action}</TableCell>
                    <TableCell>{item.ipAddress ?? "-"}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-xs">
                      {item.userAgent ?? "-"}
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
    return `/admin/audit-log?${sp.toString()}`;
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

function parseYmdToDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseYmdToDateEnd(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}
