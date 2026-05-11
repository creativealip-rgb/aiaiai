"use client";

/**
 * Admin topbar nav. Uses `usePathname()` so the current section is
 * highlighted. Kept as a tiny client component (the rest of the layout
 * stays a Server Component) to avoid paying hydration cost for the whole
 * admin shell just to toggle an `aria-current` style.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Dashboard", match: (p: string) => p === "/admin" },
  { href: "/admin/products", label: "Produk", match: (p: string) => p.startsWith("/admin/products") },
  {
    href: "/admin/categories",
    label: "Kategori",
    match: (p: string) => p.startsWith("/admin/categories"),
  },
  {
    href: "/admin/stocks",
    label: "Stok",
    match: (p: string) => p.startsWith("/admin/stocks"),
  },
  {
    href: "/admin/audit-log",
    label: "Audit",
    match: (p: string) => p.startsWith("/admin/audit-log"),
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Admin">
      {SECTIONS.map((section) => {
        const active = section.match(pathname);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-colors",
              active
                ? "bg-neutral-800 text-white"
                : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
