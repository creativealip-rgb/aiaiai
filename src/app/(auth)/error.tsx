"use client";

import Link from "next/link";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10">
      <h2 className="text-xl font-semibold">Terjadi kendala pada autentikasi.</h2>
      <p className="text-muted-foreground text-sm">
        Coba lagi sebentar lagi atau kembali ke halaman masuk.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          Coba lagi
        </button>
        <Link href="/login" className="rounded-md border px-3 py-2 text-sm font-medium">
          Ke login
        </Link>
      </div>
    </main>
  );
}

