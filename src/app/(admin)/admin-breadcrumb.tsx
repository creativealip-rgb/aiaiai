"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  admin: "Dashboard",
  products: "Produk",
  categories: "Kategori",
  stocks: "Stok",
  "audit-log": "Audit Log",
  new: "Baru",
  orders: "Orders",
  users: "Users",
  payments: "Payments",
};

function getLabel(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  if (/^[0-9a-f-]{12,}$/i.test(segment)) return "Detail";
  return decodeURIComponent(segment).replaceAll("-", " ");
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0 || parts[0] !== "admin") return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-xs text-neutral-500">
        {parts.map((segment, index) => {
          const href = `/${parts.slice(0, index + 1).join("/")}`;
          const current = index === parts.length - 1;
          const label = getLabel(segment);

          return (
            <li key={`${href}-${segment}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
              {current ? (
                <span className="text-neutral-900">{label}</span>
              ) : (
                <Link href={href} className="hover:text-neutral-900 hover:underline">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

