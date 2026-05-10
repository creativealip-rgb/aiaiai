/**
 * Drizzle ORM client (singleton).
 *
 * In dev, Next.js hot-reloads modules which can open many DB connections.
 * We cache the client on `globalThis` to avoid exhausting the pool.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  pgClient?: postgres.Sql;
  db?: DrizzleClient;
};

const pgClient =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

export const db: DrizzleClient = globalForDb.db ?? drizzle(pgClient, { schema });

if (env.NODE_ENV !== "production") {
  globalForDb.pgClient = pgClient;
  globalForDb.db = db;
}

export { schema };
