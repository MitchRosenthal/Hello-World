"use client";

import { getSupabase } from "@/lib/supabase/client";
import { useRef, useState } from "react";

const PRESIGNED_URL_API = "https://api.almostcrackd.ai/pipeline/generate-presigned-url";
const UPLOAD_IMAGE_FROM_URL_API = "https://api.almostcrackd.ai/pipeline/upload-image-from-url";
const GENERATE_CAPTIONS_API = "https://api.almostcrackd.ai/pipeline/generate-captions";
const ACCEPTED_TYPES_LIST = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];
const ACCEPTED_TYPES = ACCEPTED_TYPES_LIST.join(",");

export function ImageUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function applyFile(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES_LIST.includes(file.type)) {
      setError("Invalid file type. Use JPEG, PNG, WebP, GIF, or HEIC.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    applyFile(e.target.files?.[0] ?? null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    applyFile(file);
  }

  // Single controlled pipeline: Steps 1–4 run sequentially on "Upload & Generate Captions".
  // On any failure we setError and return; loading is cleared in finally; button disabled while loading prevents double submission.
  async function handleUploadClick() {
    if (!selectedFile) return;
    setError(null);
    setCaptions(null); // Clear previous captions on new upload
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Supabase not configured.");
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in. Sign in to upload.");
        return;
      }

      // ——— Step 1: Get presigned URL and CDN URL ———
      const res = await fetch(PRESIGNED_URL_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType: selectedFile.type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? `Request failed (${res.status})`);
        return;
      }
      const url = data?.presignedUrl ?? data?.presigned_url;
      const cdn = data?.cdnUrl ?? data?.cdn_url;
      if (typeof url !== "string" || typeof cdn !== "string") {
        setError("Invalid response: missing presignedUrl or cdnUrl");
        return;
      }

      // ——— Step 2: Upload image bytes to presigned URL ———
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });
      if (!uploadRes.ok) {
        setError(`Upload failed (${uploadRes.status}): ${uploadRes.statusText}`);
        return;
      }

      setPresignedUrl(url);
      setCdnUrl(cdn);

      // ——— Step 3: Register uploaded image URL with pipeline ———
      const registerRes = await fetch(UPLOAD_IMAGE_FROM_URL_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: cdn,
          isCommonUse: false,
        }),
      });
      const registerData = await registerRes.json().catch(() => ({}));
      if (!registerRes.ok) {
        setError(registerData?.message ?? registerData?.error ?? `Register failed (${registerRes.status})`);
        return;
      }
      const id = registerData?.imageId ?? registerData?.image_id;
      if (typeof id !== "string") {
        setError("Invalid response: missing imageId");
        return;
      }
      setImageId(id);

      // ——— Step 4: Generate captions for registered image ———
      const captionsRes = await fetch(GENERATE_CAPTIONS_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId: id }),
      });
      const captionsPayload = await captionsRes.json().catch(() => ({}));
      if (!captionsRes.ok) {
        setError(captionsPayload?.message ?? captionsPayload?.error ?? `Generate captions failed (${captionsRes.status})`);
        return;
      }
      const rawList = Array.isArray(captionsPayload) ? captionsPayload : captionsPayload?.captions ?? captionsPayload?.data;
      if (!Array.isArray(rawList)) {
        setError("Invalid response: expected array of captions");
        return;
      }
      const captionStrings = rawList.map((item: unknown) => {
        if (typeof item === "string") return item;
        const o = item as Record<string, unknown>;
        const val = o?.text ?? o?.caption ?? o?.content ?? item;
        return typeof val === "string" ? val : String(item);
      });
      setCaptions(captionStrings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get presigned URL, upload, register, or generate captions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--foreground)]/10 bg-[var(--background)] p-6">
      <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        Upload image
      </h2>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-[var(--foreground)]/40 bg-[var(--foreground)]/5"
            : "border-[var(--foreground)]/10 bg-transparent"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="block w-full text-sm text-[var(--foreground)]/80 file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--foreground)]/10 file:px-3 file:py-1.5 file:text-sm file:text-[var(--foreground)]"
        />
        <p className="mt-2 text-sm text-[var(--foreground)]/60">
          or drag and drop an image here
        </p>
      </div>
      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {previewUrl && selectedFile && (
        <div className="mb-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-64 w-full rounded-lg border border-[var(--foreground)]/10 object-contain"
          />
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
          {presignedUrl && cdnUrl && imageId && !error && (
            <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
              Image registered.
            </p>
          )}
        </div>
      )}
      {captions && captions.length > 0 && !error && (
        <div className="mb-4">
          <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
            Generated captions
          </p>
          <div className="space-y-3">
            {captions.map((text, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--foreground)]/15 bg-[var(--foreground)]/5 px-4 py-3 text-sm text-[var(--foreground)]"
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={!selectedFile || loading}
        className="rounded-lg border border-[var(--foreground)]/20 bg-[var(--foreground)]/10 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--foreground)]/15 disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload & Generate Captions"}
      </button>
    </div>
  );
}
