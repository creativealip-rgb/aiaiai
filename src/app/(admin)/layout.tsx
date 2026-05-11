import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth";

import { AdminBreadcrumb } from "./admin-breadcrumb";
import { AdminNav, AdminSidebarNav } from "./admin-nav";
import { SignOutButton } from "../(member)/dashboard/sign-out-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin",
};

// Authenticated route — never statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-0 px-0 lg:px-4">
        <aside className="hidden min-h-screen w-64 border-r bg-neutral-50 px-4 py-6 lg:block">
          <div className="space-y-1">
            <Link href="/admin" className="block text-base font-bold tracking-tight text-neutral-900">
              {env.NEXT_PUBLIC_APP_NAME} · Admin
            </Link>
            <p className="text-xs text-neutral-500">Panel operasional marketplace</p>
          </div>
          <div className="mt-6">
            <AdminSidebarNav />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="space-y-1">
                <Link href="/admin" className="text-base font-semibold tracking-tight text-neutral-900 lg:hidden">
                  {env.NEXT_PUBLIC_APP_NAME} · Admin
                </Link>
                <AdminBreadcrumb />
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:block">
                  <AdminNav />
                </div>
                <Link className="text-sm text-neutral-600 hover:text-neutral-900" href="/dashboard">
                  Dashboard member
                </Link>
                <div className="text-right text-xs">
                  <div className="font-medium text-neutral-900">{user.name || user.email}</div>
                  <div className="text-neutral-500">admin</div>
                </div>
                <SignOutButton>
                  <Button size="sm" variant="outline">
                    Keluar
                  </Button>
                </SignOutButton>
              </div>
            </div>
          </header>
          <main className="px-4 py-8 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
