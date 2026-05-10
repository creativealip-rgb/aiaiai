import Link from "next/link";
import type { ReactNode } from "react";

import { env } from "@/lib/env";

// Auth pages read query params / cookies and submit forms at runtime —
// opting out of static prerender keeps the Next.js 16 build from trying to
// render client form components (react-hook-form) without a browser context.
export const dynamic = "force-dynamic";

/**
 * Layout shared by login / register / forgot-password / reset-password.
 * Centered card container against a subtle page background.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</h1>
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">Marketplace akun &amp; jasa digital</p>
        </div>
        {children}
      </div>
    </main>
  );
}
