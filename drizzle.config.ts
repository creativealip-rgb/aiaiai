import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load env files in priority order (later calls DO NOT override earlier ones
// with dotenv unless `override: true`, so we start with the most specific).
// Mirrors Next.js's env loading convention:
//   .env.local > .env.<NODE_ENV> > .env
loadEnv({ path: ".env.local" });
loadEnv({ path: `.env.${process.env.NODE_ENV ?? "development"}` });
loadEnv({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
