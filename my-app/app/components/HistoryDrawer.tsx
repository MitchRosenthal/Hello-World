"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { Caption, Image } from "@/src/types/supabase";
import { useEffect, useState } from "react";

const CAPTIONS_TABLE = "captions";

type HistoryItem = {
  caption: Caption;
  image: Image | null;
  vote: 1 | -1;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  voteState: Record<string, 1 | -1>;
  /** Called when the user wants to change or clear a vote.
   *  Pass `null` to remove the vote entirely (the "unlike" action). */
  onChangeVote: (captionId: string, next: 1 | -1 | null) => void | Promise<void>;
};

function imageUrl(row: Image | null): string | null {
  if (!row) return null;
  const u = row.url ?? row.image_url;
  return typeof u === "string" ? u : null;
}

function captionText(c: Caption): string {
  const t = c.text ?? c.content ?? c.caption_text;
  return typeof t === "string" && t ? t : "Caption";
}

export function HistoryDrawer({
  open,
  onClose,
  userId,
  voteState,
  onChangeVote,
}: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"liked" | "disliked">("liked");

  // Load captions for whichever ids the user has voted on whenever the drawer
  // opens or vote state changes (so a freshly-liked meme appears immediately).
  useEffect(() => {
    if (!open || !userId) return;
    const ids = Object.keys(voteState);
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    supabase
      .from(CAPTIONS_TABLE)
      .select("*, images!inner(*)")
      .in("id", ids)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        type Row = Caption & { images: Image | null };
        const rows = (data ?? []) as Row[];
        const next: HistoryItem[] = rows
          .map((row) => {
            const { images, ...caption } = row;
            const v = voteState[caption.id];
            if (v !== 1 && v !== -1) return null;
            return { caption, image: images ?? null, vote: v };
          })
          .filter((x): x is HistoryItem => x !== null);
        setItems(next);
        setLoading(false);
      });
  }, [open, userId, voteState]);

  const visible = items.filter((it) => (tab === "liked" ? it.vote === 1 : it.vote === -1));

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Side panel */}
      <aside
        aria-label="Vote history"
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-[var(--foreground)]/10 bg-[var(--background)] shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-[var(--foreground)]/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Your votes</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--foreground)]/70 hover:bg-[var(--foreground)]/5"
            aria-label="Close history"
          >
            ✕
          </button>
        </header>

        <div className="flex border-b border-[var(--foreground)]/10 text-sm">
          <button
            type="button"
            onClick={() => setTab("liked")}
            className={`flex-1 py-3 font-medium transition ${
              tab === "liked"
                ? "border-b-2 border-emerald-500 text-emerald-600"
                : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            👍 Liked ({items.filter((it) => it.vote === 1).length})
          </button>
          <button
            type="button"
            onClick={() => setTab("disliked")}
            className={`flex-1 py-3 font-medium transition ${
              tab === "disliked"
                ? "border-b-2 border-red-500 text-red-600"
                : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            👎 Disliked ({items.filter((it) => it.vote === -1).length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!userId && (
            <p className="text-center text-sm text-[var(--foreground)]/60">
              Sign in to view your vote history.
            </p>
          )}
          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}
          {loading && visible.length === 0 && (
            <p className="text-center text-sm text-[var(--foreground)]/60">Loading…</p>
          )}
          {!loading && visible.length === 0 && userId && !error && (
            <p className="text-center text-sm text-[var(--foreground)]/60">
              {tab === "liked"
                ? "No liked memes yet — go like some!"
                : "Nothing in the dislike pile yet."}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {visible.map(({ caption, image }) => {
              const src = imageUrl(image);
              return (
                <li
                  key={caption.id}
                  className="flex gap-3 rounded-xl border border-[var(--foreground)]/10 bg-[var(--background)] p-3"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--foreground)]/5">
                    {src ? (
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--foreground)]/40">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="line-clamp-3 text-sm text-[var(--foreground)]">
                      {captionText(caption)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeVote(caption.id, null)}
                        className="rounded-full border border-[var(--foreground)]/20 px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/80 hover:bg-[var(--foreground)]/5"
                      >
                        Remove
                      </button>
                      {tab === "liked" ? (
                        <button
                          type="button"
                          onClick={() => onChangeVote(caption.id, -1)}
                          className="rounded-full border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10"
                        >
                          Move to 👎
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onChangeVote(caption.id, 1)}
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10"
                        >
                          Move to 👍
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
