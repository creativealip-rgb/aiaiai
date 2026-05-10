"use client";

/**
 * Global error boundary. Replaces the root layout when active, so it must
 * include its own <html> / <body>.
 *
 * Intentionally minimal and stateless — no imports, no hooks, no client
 * components beyond the required boundary — to sidestep a Next.js 16 bug
 * where the internal `/_global-error` fallback fails to prerender with
 * "Cannot read properties of null (reading 'useContext')".
 * Tracked upstream:
 *   https://github.com/vercel/next.js/issues/84994
 *   https://github.com/vercel/next.js/issues/85604
 */

export default function GlobalError() {
  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          maxWidth: "32rem",
          margin: "4rem auto",
          color: "#111",
        }}
      >
        <h2 style={{ marginBottom: "0.75rem" }}>Terjadi kesalahan.</h2>
        <p style={{ marginBottom: "1rem", color: "#555" }}>
          Sesuatu yang tidak terduga terjadi. Silakan muat ulang halaman.
        </p>
        {/* Intentionally a plain `<a>`: global-error replaces the root layout
            and must not depend on Next's AppRouterContext (Link would need it). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
            color: "#111",
            textDecoration: "none",
          }}
        >
          Kembali ke beranda
        </a>
      </body>
    </html>
  );
}
