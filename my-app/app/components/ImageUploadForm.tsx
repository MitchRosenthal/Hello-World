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
    setStage("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
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
          <p className="mb-3 text-base font-semibold text-[var(--foreground)]">
            ✨ Your captions are ready
          </p>
          <p className="mb-3 text-sm text-[var(--foreground)]/70">
            They&apos;ve been saved to the feed where everyone can vote on them.
          </p>
          <div className="space-y-2">
            {captions.map((text, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--foreground)]/15 bg-[var(--foreground)]/5 px-4 py-3 text-base text-[var(--foreground)]"
              >
                {text}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg border border-[var(--foreground)]/20 bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90"
            >
              See it in the feed →
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
