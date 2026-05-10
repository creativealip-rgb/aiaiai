/**
 * Database seed — creates the initial admin user.
 *
 * Run with `npm run db:seed`. Idempotent: if the admin already exists, only
 * ensures `role=admin`, `emailVerified=true`, `claimedAt` set, and refreshes
 * the password hash.
 *
 * Env is loaded by tsx via --env-file in the npm script.
 *
 * IMPLEMENTATION_PLAN.md §21.
 */

import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { accounts, users } from "../src/db/schema";
import { env } from "../src/lib/env";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = env.SEED_ADMIN_EMAIL.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;

  console.info(`[seed] Upserting admin user ${email} …`);

  const now = new Date();
  const hash = await hashPassword(password);

  // 1. Upsert the user row.
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;

  if (existing[0]) {
    userId = existing[0].id;
    await db
      .update(users)
      .set({
        name: existing[0].name || "AI3 Admin",
        role: "admin",
        emailVerified: true,
        claimedAt: existing[0].claimedAt ?? now,
        isBanned: false,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
    console.info(`[seed] · Updated existing user (${userId}).`);
  } else {
    const [inserted] = await db
      .insert(users)
      .values({
        name: "AI3 Admin",
        email,
        emailVerified: true,
        role: "admin",
        claimedAt: now,
      })
      .returning({ id: users.id });
    if (!inserted) throw new Error("Failed to insert admin user");
    userId = inserted.id;
    console.info(`[seed] · Created user (${userId}).`);
  }

  // 2. Upsert the credential account (providerId='credential', accountId=userId).
  const existingAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const credentialAcct = existingAccounts.find((a) => a.providerId === "credential");

  if (credentialAcct) {
    await db
      .update(accounts)
      .set({ password: hash, updatedAt: now })
      .where(eq(accounts.id, credentialAcct.id));
    console.info(`[seed] · Updated credential account password.`);
  } else {
    await db.insert(accounts).values({
      userId,
      providerId: "credential",
      // Better-Auth convention: for credential accounts, accountId == userId.
      accountId: userId,
      password: hash,
    });
    console.info(`[seed] · Inserted credential account.`);
  }

  console.info(`[seed] Done. Login at /login with ${email} / ${password}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  });
