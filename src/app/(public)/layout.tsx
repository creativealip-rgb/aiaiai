import Link from "next/link";
import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import { env } from "@/lib/env";
import { listActiveCategories } from "@/server/queries/categories";
import { getSession } from "@/server/auth";
import { buildWhatsappUrl, getWhatsappFloatSetting } from "@/server/services/site-settings";

/**
 * Shared layout for all public-facing pages (landing, catalog, detail).
 * Ships a site header with category nav and a minimal footer. The member
 * dashboard / admin panel have their own distinct layouts.
 *
 * Kept as an async Server Component so the category list is fetched once
 * per request + cached (memoised) within the render pass.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [categories, session, whatsapp] = await Promise.all([
    listActiveCategories(),
    getSession(),
    getWhatsappFloatSetting(),
  ]);
  const user = session?.user;
  const whatsappUrl = whatsapp ? buildWhatsappUrl(whatsapp.phone, whatsapp.message) : null;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold tracking-tight">
              {env.NEXT_PUBLIC_APP_NAME}
            </Link>
            <nav aria-label="Kategori" className="hidden gap-4 md:flex">
              <Link
                href="/products"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Semua produk
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/c/${category.slug}`}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                {user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="text-muted-foreground hover:text-foreground hidden sm:inline"
                  >
                    Admin
                  </Link>
                ) : null}
                <Link href="/dashboard" className="font-medium hover:underline">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground hidden sm:inline"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="bg-foreground text-background inline-flex h-8 items-center rounded-lg px-3 font-medium"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      {whatsappUrl ? (
        <Link
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-95"
          aria-label="Chat via WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Link>
      ) : null}

      <footer className="border-t py-6">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs">
          <span>
            © {new Date().getFullYear()} {env.NEXT_PUBLIC_APP_NAME}. Marketplace akun & jasa
            digital.
          </span>
          <nav className="flex gap-4" aria-label="Footer">
            <Link href="/products" className="hover:text-foreground">
              Katalog
            </Link>
            {/* These pages land in Fase 7. */}
            <span className="opacity-60">Tentang</span>
            <span className="opacity-60">Kontak</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
