import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth";

import { AdminNav } from "./admin-nav";
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
      <header className="border-b bg-neutral-950 text-neutral-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-base font-bold tracking-tight">
              {env.NEXT_PUBLIC_APP_NAME} · Admin
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-sm text-neutral-300 hover:text-white" href="/dashboard">
              Dashboard member
            </Link>
            <div className="text-right text-xs">
              <div className="font-medium">{user.name || user.email}</div>
              <div className="text-neutral-400">admin</div>
            </div>
            <SignOutButton>
              <Button size="sm" variant="outline">
                Keluar
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
