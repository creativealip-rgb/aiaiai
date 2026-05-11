import "server-only";

import pino from "pino";

import { env } from "@/lib/env";

export const logger = pino({
  level: env.LOG_LEVEL || (env.NODE_ENV === "production" ? "info" : "debug"),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "*.token",
      "*.secret",
      "*.apiKey",
    ],
    censor: "[REDACTED]",
  },
});

