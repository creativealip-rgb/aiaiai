/**
 * Drizzle schema — AI3.
 *
 * Phase 1 tables (auth):
 *   - users, sessions, accounts, verifications, rate_limit_buckets
 *
 * Phase 2 tables (catalog):
 *   - categories         : top-level product taxonomy (Hiburan, AI, …).
 *   - products           : marketplace items (type = account | service).
 *   - product_variants   : per-product price/SKU/delivery granularity.
 *
 * Better-Auth conventions:
 *   - Its Drizzle adapter uses the TypeScript property name as the "field" and
 *     queries the `name` we pass to the column builder as the actual DB column.
 *   - Table names here are PLURAL to match IMPLEMENTATION_PLAN.md §5. We signal
 *     this to Better-Auth via `usePlural: true` on the adapter (see src/lib/auth.ts).
 *   - IDs are `text` storing UUID v4 strings — Better-Auth always treats IDs as
 *     strings regardless of the underlying PG type, so `text` is the safest.
 *
 * The Phase 0 placeholder table `health_check` is kept to avoid extra migrations.
 */

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
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

export const productTypeEnum = pgEnum("product_type", ["account", "service"]);
export const deliveryTypeEnum = pgEnum("delivery_type", ["auto", "manual"]);
export const stockModeEnum = pgEnum("stock_mode", ["tracked", "unlimited"]);
export const accountStockStatusEnum = pgEnum("account_stock_status", [
  "available",
  "reserved",
  "sold",
  "disabled",
]);

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

// -- Categories -------------------------------------------------------------

/**
 * `categories` — top-level product taxonomy. Seed categories (IMPLEMENTATION_PLAN.md §2.2):
 * "Hiburan", "AI", "Produktifitas".
 *
 * Deliberately simple (flat) for MVP. Sub-categories can be added later via a
 * self-referencing `parent_id` column without breaking existing data.
 */
export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Lucide icon name (e.g. `"sparkles"`), or null for no icon. */
    icon: text("icon"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique_idx").on(table.slug),
    index("categories_is_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);

// -- Products ---------------------------------------------------------------

/**
 * `products` — marketplace items. Two shapes driven by `type`:
 *   - `account`  → digital account credentials (Netflix, Spotify, ChatGPT, ...)
 *                  typically auto-delivered from `account_stocks` (Phase 4).
 *   - `service`  → human-delivered jobs (top-up, joki, design) —
 *                  delivered manually by an admin.
 *
 * `deliveryType` is independent of `type` (a service can still have an
 * auto-issued license key; an account product might require a manual
 * fulfilment step) but typically matches: account=auto, service=manual.
 *
 * `meta` / `images` are `jsonb` with typed casts at the service layer.
 *
 * `soldCount`, `ratingAvg`, `ratingCount` are denormalised counters
 * maintained by Phase 3/4/6 services — they allow sorting by popularity
 * without an expensive `GROUP BY` on every catalog query.
 *
 * `deletedAt` is a soft-delete timestamp. Public catalog filters with
 * `deletedAt IS NULL AND isActive = true`; admin list shows everything.
 */
export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    /** `jsonb` array of image URLs (up to ~6). Default empty array. */
    images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    type: productTypeEnum("type").notNull().default("account"),
    basePrice: numeric("base_price", { precision: 14, scale: 2 }).notNull(),
    discountPrice: numeric("discount_price", { precision: 14, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    deliveryType: deliveryTypeEnum("delivery_type").notNull().default("auto"),
    warrantyDays: integer("warranty_days").notNull().default(0),
    /** Free-form attributes (per-type extras). Shape enforced at service layer. */
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    soldCount: integer("sold_count").notNull().default(0),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("products_slug_unique_idx").on(table.slug),
    index("products_category_id_idx").on(table.categoryId),
    index("products_type_idx").on(table.type),
    index("products_active_featured_idx").on(table.isActive, table.isFeatured),
    index("products_deleted_at_idx").on(table.deletedAt),
    index("products_sold_count_idx").on(table.soldCount),
    index("products_created_at_idx").on(table.createdAt),
  ],
);

// -- Product variants -------------------------------------------------------

/**
 * `product_variants` — price/SKU granularity for a product.
 *
 * Every product must have ≥1 active variant. The checkout flow (Phase 3)
 * targets a specific `(productId, variantId)` pair; stock records
 * (Phase 4) are also keyed by variant.
 *
 * `stockMode`:
 *   - `tracked`   : sold count is tied to `account_stocks` rows.
 *   - `unlimited` : no stock limit (services, or products where we resell
 *                   infinitely via upstream API).
 *
 * `sku` is unique globally so admin can CSV-import stocks by SKU alone
 * without disambiguation.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    price: numeric("price", { precision: 14, scale: 2 }).notNull(),
    stockMode: stockModeEnum("stock_mode").notNull().default("tracked"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_variants_sku_unique_idx").on(table.sku),
    index("product_variants_product_id_active_idx").on(table.productId, table.isActive),
  ],
);

// -- Account stocks ---------------------------------------------------------

export const accountStocks = pgTable(
  "account_stocks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    credentialCiphertext: text("credential_ciphertext").notNull(),
    credentialIv: text("credential_iv").notNull(),
    credentialTag: text("credential_tag").notNull(),
    label: text("label"),
    notes: text("notes"),
    status: accountStockStatusEnum("status").notNull().default("available"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    soldToOrderItemId: text("sold_to_order_item_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("account_stocks_product_variant_status_idx").on(
      table.productId,
      table.variantId,
      table.status,
    ),
    index("account_stocks_status_reserved_until_idx").on(table.status, table.reservedUntil),
  ],
);

// -- Phase 3 enums ----------------------------------------------------------

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "processing",
  "delivered",
  "partial_delivered",
  "cancelled",
  "refunded",
  "failed",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
]);

// -- Orders -----------------------------------------------------------------

export const orders = pgTable(
  "orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    isGuestOrder: boolean("is_guest_order").notNull().default(false),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }),
    discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }),
    voucherId: text("voucher_id"),
    paymentMethod: text("payment_method"),
    walletUsed: numeric("wallet_used", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_unique_idx").on(table.orderNumber),
    index("orders_user_id_status_idx").on(table.userId, table.status),
    index("orders_status_expires_at_idx").on(table.status, table.expiresAt),
  ],
);

// -- Order access tokens ----------------------------------------------------

export const orderAccessTokens = pgTable(
  "order_access_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedCount: integer("used_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("order_access_tokens_token_hash_unique_idx").on(table.tokenHash),
    index("order_access_tokens_order_id_idx").on(table.orderId),
  ],
);

// -- Order items ------------------------------------------------------------

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    qty: integer("qty").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }),
    productSnapshot: jsonb("product_snapshot").$type<Record<string, unknown>>(),
    accountStockId: text("account_stock_id"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveryNotes: text("delivery_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)],
);

// -- Credential access logs -------------------------------------------------

export const credentialAccessLogs = pgTable(
  "credential_access_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    action: text("action").notNull().default("view_credential"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("credential_access_logs_user_id_idx").on(table.userId),
    index("credential_access_logs_order_item_id_idx").on(table.orderItemId),
    index("credential_access_logs_created_at_idx").on(table.createdAt),
  ],
);

// -- Payments ---------------------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    gateway: text("gateway").notNull(),
    gatewayRef: text("gateway_ref"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    fee: numeric("fee", { precision: 14, scale: 2 }).notNull().default("0"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    method: text("method"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    rawRequest: jsonb("raw_request"),
    rawResponse: jsonb("raw_response"),
    webhookReceivedAt: timestamp("webhook_received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_gateway_ref_unique_idx").on(table.gatewayRef),
    index("payments_order_id_idx").on(table.orderId),
    index("payments_status_idx").on(table.status),
  ],
);

// -- Payment webhook events -------------------------------------------------

export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    gateway: text("gateway").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payment_webhook_events_event_id_unique_idx").on(table.eventId)],
);

// -- Type exports -----------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductType = (typeof productTypeEnum.enumValues)[number];
export type DeliveryType = (typeof deliveryTypeEnum.enumValues)[number];

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type StockMode = (typeof stockModeEnum.enumValues)[number];
export type AccountStock = typeof accountStocks.$inferSelect;
export type NewAccountStock = typeof accountStocks.$inferInsert;
export type AccountStockStatus = (typeof accountStockStatusEnum.enumValues)[number];

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type CredentialAccessLog = typeof credentialAccessLogs.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
