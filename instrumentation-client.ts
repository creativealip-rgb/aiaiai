import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0),
  sendDefaultPii: false,
  enabled:
    Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) &&
    process.env.NODE_ENV === "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
