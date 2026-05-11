import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Standalone output for lightweight Docker image in production.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",

  // Pin Turbopack workspace root to this project. Without this, Next.js may
  // auto-detect a parent directory containing another lockfile (e.g. bun.lock
  // in the user's home) and emit a warning.
  turbopack: {
    root: process.cwd(),
  },

  // Workaround for a Next.js 16 build bug where internal `/_global-error`
  // (and sometimes `/_not-found`) fallbacks fail to prerender with
  // "Cannot read properties of null (reading 'useContext')".
  // Setting the retry count to 0 makes Next.js skip prerendering those
  // routes. They remain fully functional at runtime.
  // Tracked: https://github.com/vercel/next.js/issues/84994
  //          https://github.com/vercel/next.js/issues/85604
  // Note: This flag is incompatible with Vercel hosting (which expects the
  // prerendered .rsc files). We deploy via self-hosted Docker, so it's safe
  // here. Remove once the upstream bug is fixed.
  experimental: {
    staticGenerationRetryCount: 0,
  },

  // Next.js 16: images.domains is deprecated. Use remotePatterns.
  // Add patterns here when we start hosting product images on remote CDNs.
  images: {
    remotePatterns: [],
  },

  // Security headers (baseline; tighten CSP later when we know all external origins).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withSentryConfig(
  nextConfig,
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN,
    },
  },
);
