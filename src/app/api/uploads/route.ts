/**
 * Admin-only image upload endpoint.
 *
 *   POST /api/uploads
 *     multipart/form-data
 *       file:    File          (required)
 *       folder:  "products"    (optional, default "misc")
 *
 * Returns `{ url, size }` — the `url` is a public path under `/uploads/…`.
 *
 * Security:
 *   - Session + admin role enforced server-side (never trust UI).
 *   - Accepted MIME types + 5 MB max are re-checked in `saveImage` so a
 *     rogue caller that bypasses the client validation still bounces here.
 */

import { NextResponse } from "next/server";

import {
  ALLOWED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  saveImage,
} from "@/lib/storage";
import { requireAdmin } from "@/server/auth";

export const runtime = "nodejs";
// Uploads are mutations — never cache.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await requireAdmin(); // redirects if not admin

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request harus multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field 'file' wajib disertakan." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File kosong." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Ukuran file maksimal ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `Tipe file tidak didukung (${file.type}).` },
      { status: 400 },
    );
  }

  const folderRaw = form.get("folder");
  const folder = typeof folderRaw === "string" ? folderRaw : "misc";

  try {
    const stored = await saveImage(file, folder);
    return NextResponse.json({ url: stored.url, size: stored.size });
  } catch (error) {
    console.error("[/api/uploads]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengunggah file." },
      { status: 500 },
    );
  }
}
