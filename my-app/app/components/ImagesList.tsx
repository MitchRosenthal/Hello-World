"use client";

import type { Image } from "@/src/types/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

const IMAGES_TABLE = "images";

function imageUrl(row: Image): string | null {
  const u = row.url ?? row.image_url;
  return typeof u === "string" ? u : null;
}

function imageTitle(row: Image): string {
  const t = row.title ?? row.prompt;
  return typeof t === "string" && t ? t : "Image";
}

type Props = { images: Image[]; error: string | null };

export function ImagesList({ images, error }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[200px] animate-pulse rounded-xl bg-[var(--foreground)]/5" />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-700 dark:text-red-300">
        <p className="font-semibold">Supabase error</p>
        <p className="mt-1 font-mono text-sm">{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <p className="text-[var(--foreground)]/70">
        No images with captions.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
      {images.map((row) => {
        const src = imageUrl(row);
        const title = imageTitle(row);
        return (
          <li key={row.id}>
            <Link
              href={`/images/${row.id}`}
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--foreground)]/10 bg-[var(--background)] shadow-md transition hover:border-[var(--foreground)]/20"
            >
              <div className="aspect-video w-full bg-[var(--foreground)]/5">
                {src ? (
                  <img src={src} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--foreground)]/40">
                    No image URL
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-[var(--foreground)] line-clamp-2">{title}</h2>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
