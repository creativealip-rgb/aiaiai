import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listAdminUsers } from "@/server/queries/admin-users";
import type { UserRole } from "@/db/schema";

import { UserActions } from "./user-actions";

export const metadata: Metadata = {
  title: "Admin · Users",
};

export const dynamic = "force-dynamic";

const ROLE_OPTIONS: readonly UserRole[] = ["member", "admin"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    banned?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const role = ROLE_OPTIONS.includes((params.role ?? "") as UserRole)
    ? ((params.role ?? "all") as UserRole)
    : "all";
  const banned = params.banned === "banned" || params.banned === "active" ? params.banned : "all";

  const users = await listAdminUsers({
    q: q || undefined,
    role: role === "all" ? "all" : role,
    banned,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Kelola ban/unban, reset password, dan lihat ringkasan histori order.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="q">
                Search
              </label>
              <Input id="q" name="q" placeholder="Email / nama / phone" defaultValue={q} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue={role}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="all">Semua</option>
                {ROLE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="banned">
                Status akun
              </label>
              <select
                id="banned"
                name="banned"
                defaultValue={banned}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                Terapkan filter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar user ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada user untuk filter ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">User</th>
                    <th className="py-2 pr-3 font-medium">Role</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Order</th>
                    <th className="py-2 pr-3 font-medium">Dibuat</th>
                    <th className="py-2 pr-0 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 align-top">
                        <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                          {user.name || "-"}
                        </Link>
                        <div className="text-muted-foreground text-xs">{user.email}</div>
                        {user.phone ? <div className="text-muted-foreground text-xs">{user.phone}</div> : null}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <Badge variant={user.role === "admin" ? "default" : "outline"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={user.isBanned ? "destructive" : "outline"}>
                            {user.isBanned ? "banned" : "active"}
                          </Badge>
                          <Badge variant={user.emailVerified ? "outline" : "secondary"}>
                            {user.emailVerified ? "verified" : "unverified"}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top text-xs">
                        <div>{user.orderCount} order</div>
                        <div className="text-muted-foreground">
                          last:{" "}
                          {user.lastOrderAt
                            ? new Date(user.lastOrderAt).toLocaleString("id-ID")
                            : "-"}
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-top text-xs">
                        {new Date(user.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-0 align-top">
                        <div className="flex justify-end">
                          <UserActions
                            userId={user.id}
                            userEmail={user.email}
                            isBanned={user.isBanned}
                            compact
                          />
                        </div>
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

