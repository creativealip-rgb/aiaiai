/**
 * Environment variable loader and validator.
 *
 * All env access in the app MUST go through this module, not `process.env`
 * directly. This ensures typo-free, runtime-validated, typed access.
 *
 * If any required variable is missing or malformed, the app crashes
 * at startup (fail-fast) rather than at a random request later.
 */

import { z } from "zod";

// Use `.optional()` for values that are only needed in some phases.
// Tighten these (remove `.optional()`) as we reach the phase that requires them.
const EnvSchema = z.object({
  // --- App ---
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("AI3"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // --- Database ---
  DATABASE_URL: z.string().url(),

  // --- Auth (used from Fase 1 onward) ---
  AUTH_SECRET: z.string().min(16),
  // Must be 64 hex chars == 32 bytes for AES-256.
  CREDENTIALS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "CREDENTIALS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

  // --- Mayar (used from Fase 3 onward) ---
  MAYAR_API_KEY: z.string().optional().default(""),
  MAYAR_WEBHOOK_TOKEN: z.string().optional().default(""),
  MAYAR_BASE_URL: z.string().url().default("https://api.mayar.id/hl/v1"),

  // --- Email (used from Fase 4 onward) ---
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().min(1).default("AI3 <noreply@ai3.local>"),

  // --- Storage ---
  STORAGE_PROVIDER: z.enum(["local", "supabase", "r2"]).default("local"),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),

  // --- Observability / Deploy ---
  LOG_LEVEL: z.string().optional().default(""),
  SENTRY_DSN: z.string().optional().default(""),
  SENTRY_ORG: z.string().optional().default(""),
  SENTRY_PROJECT: z.string().optional().default(""),
  SENTRY_AUTH_TOKEN: z.string().optional().default(""),
  DOMAIN: z.string().optional().default(""),

  // --- Admin seed ---
  SEED_ADMIN_EMAIL: z.string().email().default("admin@ai3.local"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin123!"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    // `z.treeifyError` would be cleaner, but `flatten` is enough for dev output.
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. See .env.example.");
  }
  return parsed.data;
}

export const env = loadEnv();
