/**
 * Pluggable storage abstraction.
 *
 * Phase 2 ships only the `local` provider — files are written to
 * `public/uploads/…` and served statically by Next.js at `/uploads/…`.
 *
 * Later phases can add `supabase` and `r2` providers; callers only use
 * `saveImage()` / `deleteImage()` so the swap is purely configurational
 * (driven by `STORAGE_PROVIDER` in `.env`).
 */

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";

/** Max accepted image size (5 MB). Matches the upload route validator. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types for product / category images. */
export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export type StoredFile = {
  /** Public URL for `next/image` (`/uploads/...`). */
  url: string;
  /** Path relative to the project root — handy for deleting later. */
  relativePath: string;
  /** Byte size at write time. */
  size: number;
};

/**
 * Save an image upload. The `folder` is a logical scope (e.g. `"products"`,
 * `"categories"`) which becomes the first segment of the public URL —
 * `/uploads/{folder}/{YYYY}/{MM}/{random}.{ext}`.
 *
 * Path layout is month-bucketed so no single directory grows unbounded.
 *
 * We validate size + MIME type again here so the underlying provider can
 * stay dumb; route handlers should still pre-validate to return nicer 400s.
 */
export async function saveImage(
  file: File,
  folder: string,
): Promise<StoredFile> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("File terlalu besar (maksimal 5 MB).");
  }
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new Error("Tipe file tidak didukung.");
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const rand = randomBytes(10).toString("hex");

  const folderSafe = folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "misc";

  // Local provider only for Phase 2. Router dispatches here.
  if (env.STORAGE_PROVIDER !== "local") {
    throw new Error(
      `STORAGE_PROVIDER=${env.STORAGE_PROVIDER} is not implemented yet (Phase 7).`,
    );
  }

  const publicDir = path.join(process.cwd(), "public");
  const relDir = path.join("uploads", folderSafe, yyyy, mm);
  const absDir = path.join(publicDir, relDir);
  const filename = `${rand}.${ext}`;
  const absFile = path.join(absDir, filename);

  await mkdir(absDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absFile, buffer);

  // Always use POSIX separators in the URL regardless of OS.
  const url = `/${path.join(relDir, filename).split(path.sep).join("/")}`;

  return {
    url,
    relativePath: path.join("public", relDir, filename),
    size: file.size,
  };
}

/**
 * Best-effort delete of a previously stored image. Never throws; failure is
 * logged and swallowed so we don't break product update flows when a file
 * was already gone or permissions changed.
 */
export async function deleteImageByUrl(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl || !publicUrl.startsWith("/uploads/")) return;
  if (env.STORAGE_PROVIDER !== "local") return;

  const rel = publicUrl.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  try {
    await unlink(abs);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | null)?.code;
    if (code && code !== "ENOENT") {
      console.warn(`[storage] failed to delete ${abs}`, err);
    }
  }
}
