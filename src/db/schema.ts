/**
 * Drizzle schema — AI3.
 *
 * Phase 1 tables:
 *   - users          : Better-Auth user table + our custom fields (role, phone,
 *                      balance, is_banned, claimed_at, deleted_at).
 *   - sessions       : Better-Auth session table.
 *   - accounts       : Better-Auth account table (credential + OAuth providers).
 *   - verifications  : Better-Auth verification-token table (email verify /
 *                      reset-password tokens).
 *   - rate_limit_buckets : DB-backed fallback for the auth rate limiter.
 *
 * Better-Auth conventions:
 *   - Its Drizzle adapter uses the TypeScript property name as the "field" and
 *     queries the `name` we pass to the column builder as the actual DB column.
 *   - Table names here are PLURAL to match IMPLEMENTATION_PLAN.md §5. We signal
 *     this to Better-Auth via `usePlural: true` on the adapter (see src/lib/auth.ts).
 *   - IDs are `text` storing UUID v4 strings — Better-Auth always treats IDs as
 *     strings regardless of the underlying PG type, so `text` is the safest.
 *
 * Previous Phase 0 placeholder table `health_check` is kept for now (dropping
 * it would require an extra migration; it's harmless).
 */

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// -- Phase 0 placeholder (kept for compatibility) ---------------------------

export const healthCheck = pgTable("health_check", {
  id: text("id").primaryKey().default("singleton"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

// -- Enums ------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);

// -- Users ------------------------------------------------------------------

/**
 * `users` — Better-Auth core fields + AI3 additional fields.
 *
 * Shadow user definition (pre-claim, created by guest checkout in Phase 3):
 *   `emailVerified = false` AND `claimedAt IS NULL` AND no `accounts` row with
 *   `providerId = 'credential'`.
 */
export const users = pgTable(
  "users",
  {
    // Better-Auth core fields
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text("name").notNull().default(""),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

    // AI3 extensions (see IMPLEMENTATION_PLAN.md §5.1)
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("member"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    isBanned: boolean("is_banned").notNull().default(false),
    /** Timestamp set when a shadow user is upgraded to a full member. */
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // Email should be unique case-insensitively. Better-Auth lowercases emails
    // before storing, so a plain unique index on email is sufficient.
    uniqueIndex("users_email_unique_idx").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_deleted_at_idx").on(table.deletedAt),
  ],
);

// -- Sessions ---------------------------------------------------------------

export const sessions = pgTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_unique_idx").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

// -- Accounts ---------------------------------------------------------------

/**
 * `accounts` — one row per auth method per user. For email/password,
 * `providerId = 'credential'` and `password` stores the argon2id hash.
 * For OAuth (e.g. Google), `providerId = 'google'` and `accountId` is the
 * provider-side user id.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    /** Argon2id hash for credential accounts, null otherwise. */
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    // A user should have at most one account per (providerId, accountId) pair.
    uniqueIndex("accounts_provider_account_unique_idx").on(table.providerId, table.accountId),
  ],
);

// -- Verifications ----------------------------------------------------------

/**
 * `verifications` — Better-Auth uses this for email-verify tokens,
 * reset-password tokens, etc. Tokens are hashed by Better-Auth; `value` stores
 * the hash (or plain for certain flows — library-managed).
 */
export const verifications = pgTable(
  "verifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
    index("verifications_expires_at_idx").on(table.expiresAt),
  ],
);

// -- Rate limit buckets -----------------------------------------------------

/**
 * `rate_limit_buckets` — fallback store for the login / forgot-password rate
 * limiter (IMPLEMENTATION_PLAN.md §7). Phase 1 uses Better-Auth's built-in
 * limiter + an in-process Map; this table lets us swap to DB-backed storage
 * for multi-process deployments without a schema change later.
 */
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

// -- Type exports -----------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

// Silence unused-import warning for `sql` — kept available for raw defaults if
// we later add e.g. `sql\`now()\`` on a column.
void sql;
