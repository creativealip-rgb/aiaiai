import "server-only";

/**
 * Server-only auth helpers used by Server Components, Server Actions, and
 * Route Handlers. Centralising these gives us one place to enforce the
 * "always validate session server-side" rule from IMPLEMENTATION_PLAN.md §9.
 *
 * Usage:
 *   const session = await getSession();            // maybe null
 *   const user = await requireUser();              // redirects to /login
 *   const admin = await requireAdmin();            // redirects if not admin
 */

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { auth, type Session } from "@/lib/auth";

/**
 * Read the current session. Memoised per-request via React's `cache` so
 * multiple callers in a single render pass hit Better-Auth once.
 *
 * Returns `null` when there's no valid session.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
});

/** Get the current user or `null`. */
export async function getCurrentUser(): Promise<Session["user"] | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Require an authenticated, non-banned user. Redirects to `/login?next=…`
 * when there's no session.
 *
 * Pass `redirectTo` to override the default `next` query value. Useful when
 * a page wants to send the user somewhere other than the current URL after
 * login (e.g. checkout flow).
 */
export async function requireUser(redirectTo?: string): Promise<Session["user"]> {
  const session = await getSession();
  if (!session) {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/login${next}`);
  }
  // TS narrowing after `redirect()` (which returns `never`).
  if (session.user.isBanned) {
    // Banned users are signed-in but locked out of the app.
    redirect("/banned");
  }
  return session.user;
}

/**
 * Require an admin. Redirects non-admins to `/dashboard` (not `/login`) so
 * members who land on an admin URL don't get a confusing auth loop.
 */
export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}

// ----------------------------------------------------------------------------
// Shadow users (IMPLEMENTATION_PLAN.md §7.8)
// ----------------------------------------------------------------------------
// A "shadow user" is a row in `users` created by guest-checkout that has never
// been claimed — i.e. no credential account and no `claimedAt` timestamp.
// Phase 3 (guest checkout) is the first consumer of this helper; it lives in
// Phase 1 so the API is stable before checkout ships.

export type ShadowUserInput = {
  email: string;
  name?: string;
  phone?: string;
};

/**
 * Find an existing user by email or create a new shadow user.
 *
 * Behaviour:
 *   - Email is normalised to lowercase (matches Better-Auth's storage).
 *   - If a user with that email exists and is **already claimed**
 *     (`claimedAt IS NOT NULL`), throws — the caller (checkout) must redirect
 *     the visitor to login instead.
 *   - If a user exists and is still shadow, fills in `name` / `phone` only
 *     when those fields are currently null (don't clobber guest-supplied
 *     data from a previous order).
 *   - Otherwise inserts a new shadow row.
 */
export async function findOrCreateShadowUser(input: ShadowUserInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("findOrCreateShadowUser: email is required");
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const current = existing[0];

  if (current) {
    if (current.claimedAt !== null) {
      throw new ShadowUserAlreadyClaimedError(email);
    }
    // Shadow user: optionally backfill name/phone if caller provided them and
    // the existing row doesn't have values.
    const patch: Partial<User> = {};
    if (input.name && !current.name) patch.name = input.name;
    if (input.phone && !current.phone) patch.phone = input.phone;

    if (Object.keys(patch).length === 0) {
      return current;
    }
    const [updated] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(users.id, current.id), isNull(users.claimedAt)))
      .returning();
    return updated ?? current;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      email,
      name: input.name ?? "",
      phone: input.phone ?? null,
      emailVerified: false,
      role: "member",
    })
    .returning();

  if (!inserted) {
    throw new Error("findOrCreateShadowUser: insert failed");
  }
  return inserted;
}

/** Thrown when a caller tries to shadow-create over an already-claimed user. */
export class ShadowUserAlreadyClaimedError extends Error {
  readonly email: string;
  constructor(email: string) {
    super(`User with email "${email}" is already registered`);
    this.name = "ShadowUserAlreadyClaimedError";
    this.email = email;
  }
}
