import Link from "next/link";
import type { ReactNode } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { listNotificationsByUser } from "@/server/services/notifications";

import { SignOutButton } from "./sign-out-button";

// Authenticated route — never statically prerender.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const notifications = await listNotificationsByUser(user.id, 20);

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-base font-bold tracking-tight">
              {env.NEXT_PUBLIC_APP_NAME}
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link className="hover:text-foreground text-muted-foreground" href="/dashboard">
                Dashboard
              </Link>
              <Link className="hover:text-foreground text-muted-foreground" href="/dashboard/orders">
                Orders
              </Link>
              <Link className="hover:text-foreground text-muted-foreground" href="/dashboard/wallet">
                Wallet
              </Link>
              <Link className="hover:text-foreground text-muted-foreground" href="/dashboard/reviews">
                Reviews
              </Link>
              <Link
                className="hover:text-foreground text-muted-foreground"
                href="/dashboard/profile"
              >
                Profil
              </Link>
              {user.role === "admin" ? (
                <Link className="hover:text-foreground text-muted-foreground" href="/admin">
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell items={notifications} />
            <div className="text-right text-xs">
              <div className="font-medium">{user.name || user.email}</div>
              <div className="text-muted-foreground capitalize">{user.role}</div>
            </div>
            <SignOutButton>
              <Button size="sm" variant="outline">
                Keluar
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
