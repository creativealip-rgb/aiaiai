/**
 * Shared price formatting. Single source of truth so invoices, catalog cards,
 * checkout summary, and admin tables all display IDR identically.
 */

const FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a numeric (possibly returned as a string by postgres-js) as `Rp 50.000`. */
export function formatIdr(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Rp 0";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "Rp 0";
  return FORMATTER.format(n);
}

/**
 * Normalise a user-entered or DB-stored price into a plain JS number.
 * Returns `NaN` for invalid input so callers can guard.
 */
export function toPriceNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return NaN;
  return typeof value === "string" ? Number(value) : value;
}

/**
 * Percentage discount (rounded to integer) between `basePrice` and
 * `discountPrice`. Returns null when no effective discount.
 */
export function discountPercent(
  basePrice: number | string,
  discountPrice: number | string | null | undefined,
): number | null {
  const base = toPriceNumber(basePrice);
  const disc = toPriceNumber(discountPrice);
  if (!Number.isFinite(base) || base <= 0) return null;
  if (!Number.isFinite(disc) || disc <= 0 || disc >= base) return null;
  return Math.round((1 - disc / base) * 100);
}

/** Return the effective price a buyer pays: `discountPrice` if set, else `basePrice`. */
export function effectivePrice(
  basePrice: number | string,
  discountPrice: number | string | null | undefined,
): number {
  const base = toPriceNumber(basePrice);
  const disc = toPriceNumber(discountPrice);
  if (Number.isFinite(disc) && disc > 0 && disc < base) return disc;
  return base;
}
