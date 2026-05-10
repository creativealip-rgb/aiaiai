/**
 * Next.js 16 Proxy (formerly `middleware.ts`).
 *
 * - Protects `/dashboard/**` and `/admin/**` routes with an OPTIMISTIC
 *   cookie-only check. Because the proxy runs on every matched request
 *   (including prefetches), we avoid any DB/auth.api round-trip here.
 * - Actual session validation + role enforcement happens in the page itself
 *   via `requireUser()` / `requireAdmin()` from `@/server/auth`.
 *
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *      https://www.better-auth.com/docs/integrations/next#nextjs-16-proxy
 *
 * NOTE: In Next.js 16 the file MUST be named `proxy.ts` (not `middleware.ts`)
 * and the function MUST be `proxy`. The `runtime` config option is not
 * allowed here — the proxy always runs on the Node.js runtime.
 */

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (sessionCookie) {
    return NextResponse.next();
  }

  // No session → bounce to /login with a `next` param so the user returns to
  // their original destination after signing in.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match dashboard + admin; exclude static and image-opt paths entirely.
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
