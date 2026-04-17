"use client";

import { getSupabase } from "@/lib/supabase/client";
import Link from "next/link";
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

// Pipeline progress states for the visible step indicator.
type Stage =
  | "idle"
  | "preparing"
  | "uploading"
  | "registering"
  | "generating"
  | "done"
  | "error";

const STEPS: { key: Exclude<Stage, "idle" | "error">; label: string }[] = [
  { key: "preparing", label: "Preparing" },
  { key: "uploading", label: "Uploading" },
  { key: "registering", label: "Registering" },
  { key: "generating", label: "Generating captions" },
  { key: "done", label: "Done" },
];

function stageIndex(stage: Stage): number {
  if (stage === "idle" || stage === "error") return -1;
  return STEPS.findIndex((s) => s.key === stage);
}

export function ImageUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[] | null>(null);
  const [favoriteIdx, setFavoriteIdx] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = stage !== "idle" && stage !== "done" && stage !== "error";

  function applyFile(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setCaptions(null);
    setFavoriteIdx(null);
    setDownloadError(null);
    setStage("idle");
    setImageId(null);
    setPresignedUrl(null);
    setCdnUrl(null);
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

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPresignedUrl(null);
    setCdnUrl(null);
    setImageId(null);
    setCaptions(null);
    setFavoriteIdx(null);
    setDownloadError(null);
    setStage("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Render the user's image with the chosen caption baked in at the bottom in
  // classic Impact-style white-with-black-stroke text, then trigger a PNG download.
  // Uses the local file (object URL) — same-origin so canvas isn't tainted.
  async function handleDownload() {
    if (!selectedFile || favoriteIdx == null || !captions) return;
    const captionText = captions[favoriteIdx];
    if (!captionText) return;

    setDownloading(true);
    setDownloadError(null);
    const objectUrl = URL.createObjectURL(selectedFile);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not load image for rendering"));
        el.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");

      // Draw the original image as the background.
      ctx.drawImage(img, 0, 0);

      // Font sized proportionally to image width, with sane min/max.
      const fontSize = Math.max(28, Math.min(110, Math.floor(img.naturalWidth / 14)));
      ctx.font = `900 ${fontSize}px Impact, "Anton", "Arial Black", "Helvetica Neue", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = Math.max(3, fontSize / 10);
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      // Word-wrap the caption to fit ~92% of the image width.
      const maxWidth = img.naturalWidth * 0.92;
      const words = captionText.toUpperCase().split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let current = "";
      for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = w;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);

      // Stack lines from the bottom up so the last line sits closest to the edge.
      const lineHeight = fontSize * 1.15;
      const x = img.naturalWidth / 2;
      const bottomPadding = Math.max(16, fontSize * 0.4);
      let y = img.naturalHeight - bottomPadding;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
        y -= lineHeight;
      }

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("Could not encode image");

      // Trigger the download.
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `meme-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setDownloading(false);
    }
  }

  // Single controlled pipeline: Steps 1–4 run sequentially on "Upload & Generate Captions".
  // Stage advances at each step so the progress bar reflects what's happening.
  async function handleUploadClick() {
    if (!selectedFile) return;
    setError(null);
    setCaptions(null);
    setStage("preparing");
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Supabase not configured.");
        setStage("error");
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in. Sign in to upload.");
        setStage("error");
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
        setStage("error");
        return;
      }
      const url = data?.presignedUrl ?? data?.presigned_url;
      const cdn = data?.cdnUrl ?? data?.cdn_url;
      if (typeof url !== "string" || typeof cdn !== "string") {
        setError("Invalid response: missing presignedUrl or cdnUrl");
        setStage("error");
        return;
      }

      // ——— Step 2: Upload image bytes to presigned URL ———
      setStage("uploading");
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });
      if (!uploadRes.ok) {
        setError(`Upload failed (${uploadRes.status}): ${uploadRes.statusText}`);
        setStage("error");
        return;
      }

      setPresignedUrl(url);
      setCdnUrl(cdn);

      // ——— Step 3: Register uploaded image URL with pipeline ———
      setStage("registering");
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
        setStage("error");
        return;
      }
      const id = registerData?.imageId ?? registerData?.image_id;
      if (typeof id !== "string") {
        setError("Invalid response: missing imageId");
        setStage("error");
        return;
      }
      setImageId(id);

      // ——— Step 4: Generate captions for registered image ———
      setStage("generating");
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
        setStage("error");
        return;
      }
      const rawList = Array.isArray(captionsPayload) ? captionsPayload : captionsPayload?.captions ?? captionsPayload?.data;
      if (!Array.isArray(rawList)) {
        setError("Invalid response: expected array of captions");
        setStage("error");
        return;
      }
      const captionStrings = rawList.map((item: unknown) => {
        if (typeof item === "string") return item;
        const o = item as Record<string, unknown>;
        const val = o?.text ?? o?.caption ?? o?.content ?? item;
        return typeof val === "string" ? val : String(item);
      });
      setCaptions(captionStrings);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get presigned URL, upload, register, or generate captions");
      setStage("error");
    }
  }

  const currentStepIndex = stageIndex(stage);

  return (
    <div className="rounded-2xl border border-[var(--foreground)]/10 bg-[var(--background)] p-6 shadow-sm">
      <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
        Add a meme
      </h2>
      <p className="mb-6 text-sm text-[var(--foreground)]/70">
        Upload an image and we&apos;ll generate funny captions for you to share with the feed.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`mb-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-emerald-500/60 bg-emerald-500/10"
            : "border-[var(--foreground)]/20 bg-[var(--foreground)]/[0.02] hover:border-[var(--foreground)]/40 hover:bg-[var(--foreground)]/5"
        }`}
      >
        <div className="text-4xl">🖼️</div>
        <p className="mt-3 text-base font-medium text-[var(--foreground)]">
          {selectedFile ? "Choose a different image" : "Drop an image here"}
        </p>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          or click to browse · JPEG, PNG, WebP, GIF, HEIC
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Preview */}
      {previewUrl && selectedFile && (
        <div className="mb-5">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-72 w-full rounded-xl border border-[var(--foreground)]/10 object-contain"
          />
          <p className="mt-2 text-xs text-[var(--foreground)]/60">
            {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      {/* Step indicator (visible while in progress, after success, or after error) */}
      {(loading || stage === "done" || stage === "error") && (
        <div className="mb-5 rounded-xl border border-[var(--foreground)]/10 bg-[var(--foreground)]/[0.02] p-4">
          <ol className="flex flex-col gap-2">
            {STEPS.map((step, i) => {
              const isActive = stage === step.key;
              const isComplete =
                currentStepIndex > i || (stage === "done" && step.key === "done");
              return (
                <li key={step.key} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isComplete
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? "bg-[var(--foreground)] text-[var(--background)]"
                          : "border border-[var(--foreground)]/20 text-[var(--foreground)]/40"
                    }`}
                  >
                    {isComplete ? "✓" : isActive ? (
                      <span className="inline-block animate-spin">◐</span>
                    ) : i + 1}
                  </span>
                  <span
                    className={
                      isActive
                        ? "font-semibold text-[var(--foreground)]"
                        : isComplete
                          ? "text-[var(--foreground)]/80"
                          : "text-[var(--foreground)]/50"
                    }
                  >
                    {step.label}
                    {isActive && step.key === "generating" && (
                      <span className="ml-2 text-xs text-[var(--foreground)]/60">
                        (this can take a moment)
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Generated captions display */}
      {captions && captions.length > 0 && stage === "done" && (
        <div className="mb-5">
          <p className="mb-1 text-base font-semibold text-[var(--foreground)]">
            ✨ Your captions are ready
          </p>
          <p className="mb-3 text-sm text-[var(--foreground)]/70">
            Pick your favorite, then download the meme.
          </p>
          <div role="radiogroup" aria-label="Choose your favorite caption" className="space-y-2">
            {captions.map((text, i) => {
              const selected = favoriteIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFavoriteIdx(i)}
                  className={
                    "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-base transition " +
                    (selected
                      ? "border-emerald-500/60 bg-emerald-500/10 text-[var(--foreground)] ring-2 ring-emerald-500/30"
                      : "border-[var(--foreground)]/15 bg-[var(--foreground)]/5 text-[var(--foreground)] hover:border-[var(--foreground)]/30 hover:bg-[var(--foreground)]/[0.08]")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 " +
                      (selected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-[var(--foreground)]/30")
                    }
                  >
                    {selected ? "✓" : ""}
                  </span>
                  <span>{text}</span>
                </button>
              );
            })}
          </div>

          {downloadError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{downloadError}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={favoriteIdx == null || downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden>⬇</span>
              {downloading
                ? "Building meme…"
                : favoriteIdx == null
                  ? "Select a caption to download"
                  : "Download meme"}
            </button>
            <Link
              href="/"
              className="rounded-lg border border-[var(--foreground)]/20 bg-transparent px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
            >
              Go to feed
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-[var(--foreground)]/20 bg-transparent px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

      {/* Primary action button (hidden once done — the next-step CTA replaces it) */}
      {stage !== "done" && (
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={!selectedFile || loading}
          className="w-full rounded-lg border border-[var(--foreground)]/20 bg-[var(--foreground)] px-4 py-3 text-base font-semibold text-[var(--background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? STEPS[currentStepIndex]?.label
              ? `${STEPS[currentStepIndex].label}…`
              : "Working…"
            : "Upload & Generate Captions"}
        </button>
      )}

      {/* Quietly mention the registered state for debugging visibility */}
      {presignedUrl && cdnUrl && imageId && stage !== "done" && stage !== "error" && (
        <p className="mt-3 text-xs text-[var(--foreground)]/50">
          Image registered (id {imageId.slice(0, 8)}…)
        </p>
      )}
    </div>
  );
}
