"use client";

/**
 * Better-Auth React client.
 *
 * Exposes hooks and imperative helpers for the UI:
 *   - `authClient.signIn.email({...})` / `authClient.signIn.social({...})`
 *   - `authClient.signUp.email({...})`
 *   - `authClient.signOut()`
 *   - `authClient.requestPasswordReset({...})`, `authClient.resetPassword({...})`
 *   - `authClient.useSession()` — reactive session hook
 *
 * `inferAdditionalFields` mirrors the `user.additionalFields` config on the
 * server so `session.user.role` / `phone` / `balance` / `isBanned` are typed.
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  // If omitted, the client assumes same-origin, which is what we want for the
  // App Router. Keep the baseURL explicit so local proxying / previews work.
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
