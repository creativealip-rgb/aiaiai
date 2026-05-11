"use client";

/**
 * Reusable image uploader.
 *
 * - Drag-drop or click to select multiple images.
 * - Each file is uploaded to `/api/uploads` individually; the server returns
 *   a public `/uploads/...` URL which is appended to the parent-controlled
 *   `value` array.
 * - Parent can designate `maxFiles`. First image in the array is treated as
 *   the thumbnail by the product form.
 * - Reorder is via "Jadikan thumbnail" + delete — no drag reorder for MVP.
 */

import { ImageIcon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ImageUploaderProps = {
  value: string[];
  onChange: (next: string[]) => void;
  maxFiles?: number;
  folder?: string;
  disabled?: boolean;
};

const DEFAULT_MAX = 6;

export function ImageUploader({
  value,
  onChange,
  maxFiles = DEFAULT_MAX,
  folder = "products",
  disabled,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const atLimit = value.length >= maxFiles;

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    const remaining = Math.max(0, maxFiles - value.length);
    const toUpload = files.slice(0, remaining);
    if (toUpload.length < files.length) {
      toast.warning(`Maksimal ${maxFiles} gambar. ${files.length - toUpload.length} file diabaikan.`);
    }

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of toUpload) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data: { url?: string; error?: string } = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? `Gagal mengunggah ${file.name}`);
        }
        uploaded.push(data.url);
      }
      onChange([...value, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setIsDragging(false);
    if (disabled || atLimit) return;
    const files = Array.from(ev.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
    void uploadFiles(files);
  }

  function makeThumbnail(url: string) {
    if (value[0] === url) return;
    onChange([url, ...value.filter((u) => u !== url)]);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      <div
        role="region"
        aria-label="Area unggah gambar"
        onDragOver={(ev) => {
          ev.preventDefault();
          if (!disabled && !atLimit) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-input hover:border-muted-foreground flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
          (disabled || atLimit) && "cursor-not-allowed opacity-60",
        )}
        onClick={() => {
          if (!disabled && !atLimit) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(ev) => {
            const files = Array.from(ev.target.files ?? []);
            ev.target.value = "";
            void uploadFiles(files);
          }}
          disabled={disabled || atLimit}
        />
        {uploading ? (
          <>
            <UploadIcon className="h-5 w-5 animate-pulse" />
            <p className="text-muted-foreground text-sm">Mengunggah…</p>
          </>
        ) : atLimit ? (
          <>
            <ImageIcon className="h-5 w-5" />
            <p className="text-muted-foreground text-sm">
              Batas maksimal {maxFiles} gambar tercapai. Hapus salah satu untuk menambah lagi.
            </p>
          </>
        ) : (
          <>
            <UploadIcon className="h-5 w-5" />
            <p className="text-sm font-medium">Klik atau tarik gambar ke sini</p>
            <p className="text-muted-foreground text-xs">
              JPEG / PNG / WEBP / AVIF · max 5 MB · {value.length}/{maxFiles}
            </p>
          </>
        )}
      </div>

      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, idx) => {
            const isThumb = idx === 0;
            return (
              <li key={url} className="group/thumb relative">
                <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
                  <Image
                    src={url}
                    alt={isThumb ? "Thumbnail produk" : `Galeri ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 25vw"
                    className="object-cover"
                    unoptimized
                  />
                  {isThumb ? (
                    <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                      Thumbnail
                    </span>
                  ) : null}
                </div>
                <div className="absolute inset-0 flex items-end justify-between gap-1 rounded-lg bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    disabled={isThumb || disabled}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      makeThumbnail(url);
                    }}
                    aria-label="Jadikan thumbnail"
                  >
                    <StarIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="destructive"
                    disabled={disabled}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      remove(url);
                    }}
                    aria-label="Hapus gambar"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
