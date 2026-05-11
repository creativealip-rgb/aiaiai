"use client";

import Link from "next/link";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h2 className="text-xl font-semibold">Terjadi kendala di halaman publik.</h2>
      <p className="text-muted-foreground text-sm">
        Silakan coba muat ulang. Jika masih gagal, kembali ke beranda.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-md border px-3 py-2 text-sm font-medium"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}

