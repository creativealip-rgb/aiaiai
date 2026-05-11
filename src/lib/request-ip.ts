import "server-only";

function normalizeIp(raw: string | null): string {
  if (!raw) return "unknown";
  const first = raw.split(",")[0]?.trim();
  if (!first) return "unknown";
  return first;
}

export function getClientIpFromHeaders(
  headersLike: Pick<Headers, "get">,
): string {
  return normalizeIp(
    headersLike.get("x-forwarded-for") ??
      headersLike.get("x-real-ip") ??
      headersLike.get("cf-connecting-ip"),
  );
}

