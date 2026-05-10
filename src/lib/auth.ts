/**
 * Better-Auth server instance for AI3.
 *
 * - Uses the Drizzle adapter against our Postgres schema (plural table names).
 * - Email/password auth with argon2id hashing (overrides Better-Auth's default
 *   scrypt).
 * - Google OAuth, gated on env vars being present.
 * - `account.accountLinking` enabled with `google` as a trusted provider so a
 *   shadow user (created by guest checkout in Phase 3) whose email matches a
 *   Google sign-in is auto-linked.
 * - `additionalFields` make our extras (role, phone, balance, isBanned)
 *   type-inferable on `session.user`.
 * - `nextCookies()` plugin is listed LAST so server-action calls from the UI
 *   can set auth cookies correctly.
 *
 * IMPLEMENTATION_PLAN.md §9, §7.8.
 */

import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";

// ----------------------------------------------------------------------------
// Email delivery stubs (Phase 4 will wire Resend + react-email templates).
// For Phase 1 we log the action + URL so local testing works end-to-end.
// ----------------------------------------------------------------------------

type MailPayload = {
  to: string;
  subject: string;
  url: string;
  kind: "verify-email" | "reset-password";
};

async function sendAuthEmail({ to, subject, url, kind }: MailPayload) {
  // Intentionally not awaited by callers (Better-Auth also fire-and-forgets
  // these to avoid timing attacks). Keep this function fast & side-effect-free.
  console.info(`\n[auth:email] ${kind} → ${to}\n  subject: ${subject}\n  url:     ${url}\n`);
}

// ----------------------------------------------------------------------------
// Google OAuth — only enabled when both client id and secret are present. This
// avoids a startup crash in local dev where a Google project might not be
// set up yet.
// ----------------------------------------------------------------------------

const hasGoogleOAuth = env.GOOGLE_CLIENT_ID.length > 0 && env.GOOGLE_CLIENT_SECRET.length > 0;

const socialProviders = hasGoogleOAuth
  ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        // Google always returns verified emails, so we mark users as verified
        // on first Google sign-in. `mapProfileToUser` also lets us fill in the
        // `image` field from the provider.
        mapProfileToUser: (profile: {
          email: string;
          name: string;
          picture?: string;
          email_verified?: boolean;
        }) => ({
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          emailVerified: profile.email_verified ?? true,
        }),
      },
    }
  : undefined;

// ----------------------------------------------------------------------------
// The auth instance. Exported as a singleton.
// ----------------------------------------------------------------------------

export const auth = betterAuth({
  appName: env.NEXT_PUBLIC_APP_NAME,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // Our tables are plural (`users`, `sessions`, ...); this tells Better-Auth
    // to translate its singular model names to the plural table names.
    usePlural: true,
  }),

  advanced: {
    database: {
      // Generate UUIDs for every Better-Auth-owned insert so our IDs are
      // uniform regardless of whether the row was created by Better-Auth or by
      // our own code (e.g. findOrCreateShadowUser).
      generateId: () => randomUUID(),
    },
    // Cookie cache speeds up proxy / middleware session reads. Short TTL so
    // role changes (ban, promote) propagate quickly.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Users must verify their email before signing in (IMPLEMENTATION_PLAN.md §9).
    requireEmailVerification: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    // argon2id
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    sendResetPassword: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Reset your AI3 password",
        url,
        kind: "reset-password",
      });
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendAuthEmail({
        to: user.email,
        subject: "Verify your AI3 email",
        url,
        kind: "verify-email",
      });
    },
  },

  ...(socialProviders ? { socialProviders } : {}),

  account: {
    accountLinking: {
      // Link incoming social accounts to an existing user by matching verified
      // email. Google is trusted, so it links even without an existing email.
      enabled: true,
      trustedProviders: hasGoogleOAuth ? ["google"] : [],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },

  user: {
    // Make our custom columns type-inferable on `session.user` and sign-up
    // payloads. `input: false` means the field cannot be set via the public
    // sign-up endpoint (admin-only or internal mutations).
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      role: {
        type: ["member", "admin"] as const,
        required: false,
        defaultValue: "member",
        input: false,
      },
      balance: {
        // postgres-js returns numeric columns as strings.
        type: "string",
        required: false,
        defaultValue: "0",
        input: false,
      },
      isBanned: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },

  // Built-in rate limits. Tight caps on sign-in and password-reset endpoints
  // to slow online brute force; the rest of the auth endpoints fall back to
  // the library's default (global) limit.
  rateLimit: {
    enabled: true,
    // `storage: "memory"` — in-process only. Good enough for Phase 1 / single
    // node dev. Swap to "database" (with `modelName: "rateLimitBuckets"`) or
    // Upstash Redis in production (Phase 7).
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 5 },
      "/sign-up/email": { window: 15 * 60, max: 10 },
      "/request-password-reset": { window: 60 * 60, max: 3 },
      "/send-verification-email": { window: 60 * 60, max: 3 },
    },
  },

  databaseHooks: {
    // When a Google sign-in links to an existing shadow user, flip claimedAt
    // on the user so we know the shadow has been claimed. This mirrors the
    // §7.8 guarantee that OAuth sign-in auto-claims a matching shadow user.
    account: {
      create: {
        after: async (account) => {
          try {
            await db
              .update(schema.users)
              .set({ claimedAt: new Date() })
              .where(and(eq(schema.users.id, account.userId), isNull(schema.users.claimedAt)));
          } catch (error) {
            console.error("[auth] failed to mark claimedAt after account create", error);
          }
        },
      },
    },
    // Track last_login_at on session creation (cheap, ~1 UPDATE per login).
    session: {
      create: {
        after: async (session) => {
          try {
            await db
              .update(schema.users)
              .set({ lastLoginAt: new Date() })
              .where(eq(schema.users.id, session.userId));
          } catch (error) {
            console.error("[auth] failed to update lastLoginAt", error);
          }
        },
      },
    },
  },

  // IMPORTANT: nextCookies() must be the LAST plugin so it wraps every
  // response and commits Set-Cookie headers from inside server actions.
  plugins: [nextCookies()],
});

// Convenience types for the rest of the app.
export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
