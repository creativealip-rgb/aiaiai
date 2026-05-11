/**
 * Shared result type for Server Actions.
 *
 * Actions return `{ ok: true, data }` on success and
 * `{ ok: false, error, fieldErrors? }` on failure. Clients (usually
 * react-hook-form) can surface `fieldErrors` per input.
 *
 * We intentionally *don't* throw across the server/client boundary — Next.js
 * only preserves error *messages* in production, so custom error classes lose
 * their discriminant. A discriminated union is the reliable path.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(
  error: string,
  opts?: { code?: string; fieldErrors?: Record<string, string[]> },
): ActionResult<never> {
  return { ok: false, error, code: opts?.code, fieldErrors: opts?.fieldErrors };
}
