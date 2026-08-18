"use client";

import { useCallback, useRef, useState } from "react";

const MAX_PHOTOS = 8;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URL_CHARS = 850_000;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error("Photo is still too large after compression");
  }
  return dataUrl;
}

export function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError("");
      setBusy(true);
      try {
        const remaining = MAX_PHOTOS - photos.length;
        if (remaining <= 0) {
          throw new Error(`Maximum ${MAX_PHOTOS} photos`);
        }
        const selected = Array.from(files).slice(0, remaining);
        const next: string[] = [];
        for (const file of selected) {
          next.push(await fileToCompressedDataUrl(file));
        }
        onChange([...photos, ...next]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add this place photo");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, photos]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Photos</p>
          <p className="mt-0.5 text-xs text-muted">
            Upload 1–{MAX_PHOTOS} photos. They are compressed to JPEG in the
            browser (iPhone HEIC included on Safari).
          </p>
        </div>
        <button
          type="button"
          disabled={busy || photos.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground disabled:opacity-50"
        >
          {busy ? "Processing…" : "Add photos"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-4 py-10 text-sm text-muted transition hover:border-accent hover:text-foreground"
        >
          <span>Tap to add photos of the place</span>
          <span className="text-xs">JPEG, PNG, WebP, or iPhone HEIC</span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((src, index) => (
            <li
              key={`${index}-${src.slice(0, 32)}`}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-accent-soft/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Place photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-2 top-2 rounded-full bg-foreground/80 px-2 py-1 text-xs text-white"
                onClick={() =>
                  onChange(photos.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
