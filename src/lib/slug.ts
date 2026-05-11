/**
 * Slug helpers — convert human names into URL-safe identifiers.
 *
 * Keep this deterministic and unicode-aware: Indonesian category/product names
 * contain letters like `é`, `ñ`, etc. We normalise to NFKD, strip diacritics,
 * collapse non-alphanumeric runs into single `-`, lowercase, then trim.
 *
 * Also exposes `ensureUniqueSlug()` which appends `-2`, `-3`, ... until the
 * provided `exists` predicate returns false. Callers supply their own DB
 * lookup to avoid coupling this module to a specific table.
 */

const MAX_SLUG_LENGTH = 80;

/** Convert any string to a URL-safe, lowercase slug. Idempotent. */
export function slugify(input: string): string {
  const normalised = input
    .normalize("NFKD")
    // Drop combining marks (accents) left over from NFKD.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const slug = normalised
    // Replace any non-alphanumeric sequence with a single dash.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // Trim trailing dashes introduced by the length clamp.
    .replace(/-+$/g, "");

  return slug;
}

/**
 * Append `-2`, `-3`, ... until `exists(candidate)` returns false.
 *
 * @param base       The slug to start from. Will be slugified if not already.
 * @param exists     Async predicate — usually a DB lookup scoped to the table
 *                   you care about. Must return `true` when the candidate
 *                   slug is already taken.
 * @param maxAttempts Guard so we don't loop forever if something is broken.
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  maxAttempts = 100,
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let attempt = 1;

  while (await exists(candidate)) {
    attempt += 1;
    if (attempt > maxAttempts) {
      throw new Error(`ensureUniqueSlug: exhausted ${maxAttempts} attempts for "${root}"`);
    }
    candidate = `${root}-${attempt}`;
  }

  return candidate;
}
