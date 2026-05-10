/**
 * Better-Auth route handler. All auth routes (sign-in, sign-up, callback,
 * verify-email, reset-password, sign-out, etc.) are dispatched from here.
 *
 * See: https://www.better-auth.com/docs/integrations/next#create-api-route
 */

import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
