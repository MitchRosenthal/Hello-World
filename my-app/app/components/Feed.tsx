"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { Caption, CaptionVoteInsert, Image } from "@/src/types/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HistoryDrawer } from "./HistoryDrawer";

const CAPTIONS_TABLE = "captions";
const CAPTION_VOTES_TABLE = "caption_votes";
const BATCH_SIZE = 20;
// Threshold (in px) past which a horizontal swipe is treated as a vote.
const SWIPE_THRESHOLD = 80;

function imageUrl(row: Image | null): string | null {
  if (!row) return null;
  const u = row.url ?? row.image_url;
  return typeof u === "string" ? u : null;
}

function captionText(c: Caption): string {
  const t = c.text ?? c.content ?? c.caption_text;
  return typeof t === "string" && t ? t : "Caption";
}

type FeedItem = { caption: Caption; image: Image | null };

type Props = { userId: string | null };

export function Feed({ userId }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [voteState, setVoteState] = useState<Record<string, 1 | -1>>({});
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [votingCaptionId, setVotingCaptionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Captions to hide from the feed: anything the user has already voted on
  // (loaded from caption_votes on mount + appended whenever they vote in-session)
  // PLUS captions shown in this session (so infinite-scroll batches don't repeat).
  const votedIdsRef = useRef<Set<string>>(new Set());
  const seenCaptionIds = useRef<Set<string>>(new Set());

  // Per-card swipe gesture tracking.
  const dragStartX = useRef<Record<string, number>>({});
  const [dragX, setDragX] = useState<Record<string, number>>({});

  const loadBatch = useCallback(
    async (from: number, opts: { reset?: boolean } = {}) => {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Supabase not configured.");
        return { count: 0 };
      }
      setLoading(true);
      setError(null);

      let query = supabase
        .from(CAPTIONS_TABLE)
        .select("*, images!inner(*)")
        .order("id", { ascending: true })
        .range(from, from + BATCH_SIZE - 1);

      // Always exclude captions the user has already voted on or already seen
      // this session — voted memes shouldn't reappear in the feed.
      const excluded = new Set<string>([
        ...votedIdsRef.current,
        ...seenCaptionIds.current,
      ]);
      if (excluded.size > 0) {
        // Supabase's not.in expects a parenthesized list literal.
        query = query.not("id", "in", `(${Array.from(excluded).join(",")})`);
      }

      const { data: rows, error: captionsError } = await query;

      if (captionsError) {
        setError(captionsError.message);
        setLoading(false);
        return { count: 0 };
      }
      if (!rows?.length) {
        setHasMore(false);
        setLoading(false);
        return { count: 0 };
      }

      type Row = Caption & { images: Image | null };
      const newItems: FeedItem[] = (rows as Row[])
        .map((row) => {
          const { images, ...caption } = row;
          return { caption, image: images ?? null };
        })
        .filter((item): item is FeedItem => item.image != null);

      const captionIds = newItems.map((item) => item.caption.id);

      // Track seen ids so the next batch / refresh skips what's on screen.
      for (const id of captionIds) seenCaptionIds.current.add(id);

      setItems((prev) => (opts.reset ? newItems : [...prev, ...newItems]));
      // Note: voteState for these items is empty by definition (we excluded voted captions).
      setOffset(opts.reset ? rows.length : from + rows.length);
      setHasMore(rows.length === BATCH_SIZE);
      setLoading(false);
      return { count: newItems.length };
    },
    []
  );

  // ── Bootstrap: load the user's existing votes BEFORE the first feed batch
  // so we can (a) seed the history drawer and (b) exclude already-voted memes
  // from the very first query.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const supabase = getSupabase();
      if (!supabase) {
        setBootstrapped(true);
        return;
      }
      if (userId) {
        const { data } = await supabase
          .from(CAPTION_VOTES_TABLE)
          .select("caption_id, vote_value")
          .eq("profile_id", userId);
        if (cancelled) return;
        const map: Record<string, 1 | -1> = {};
        for (const v of data ?? []) {
          if (v.vote_value === 1 || v.vote_value === -1) {
            map[v.caption_id] = v.vote_value;
            votedIdsRef.current.add(v.caption_id);
          }
        }
        setVoteState(map);
      }
      setBootstrapped(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // First batch only fires once bootstrap is complete (so the exclude set is ready).
  useEffect(() => {
    if (!bootstrapped) return;
    loadBatch(0, { reset: true });
  }, [bootstrapped, loadBatch]);

  // Infinite scroll: load next batch as user nears the end.
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadBatch(offset);
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, offset, loadBatch]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    // Refresh shows fresh content the user hasn't seen this session.
    // The exclude filter still removes previously-voted memes, so refresh never
    // re-serves something the user has already rated.
    const { count } = await loadBatch(0, { reset: true });
    if (count === 0) {
      // Pool is genuinely exhausted — clear in-session seen so they get the
      // (still-not-voted) memes again rather than an empty feed.
      seenCaptionIds.current.clear();
      await loadBatch(0, { reset: true });
    }
    setRefreshing(false);
    // Snap viewport back to top.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const upsertVote = useCallback(
    async (captionId: string, vote: 1 | -1) => {
      const supabase = getSupabase();
      if (!supabase) {
        setVoteError("Supabase not configured.");
        return false;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setVoteError("Sign in to vote.");
        return false;
      }
      setVoteError(null);
      setVotingCaptionId(captionId);

      const { data: existing } = await supabase
        .from(CAPTION_VOTES_TABLE)
        .select("id")
        .eq("profile_id", user.id)
        .eq("caption_id", captionId)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from(CAPTION_VOTES_TABLE)
          .update({ vote_value: vote, modified_by_user_id: user.id })
          .eq("profile_id", user.id)
          .eq("caption_id", captionId);
        setVotingCaptionId(null);
        if (updateError) {
          setVoteError(updateError.message);
          return false;
        }
      } else {
        const row: CaptionVoteInsert = {
          caption_id: captionId,
          profile_id: user.id,
          vote_value: vote,
          created_by_user_id: user.id,
          modified_by_user_id: user.id,
        };
        const { error: insertError } = await supabase
          .from(CAPTION_VOTES_TABLE)
          .insert(row);
        setVotingCaptionId(null);
        if (insertError) {
          setVoteError(insertError.message);
          return false;
        }
      }
      setVoteState((prev) => ({ ...prev, [captionId]: vote }));
      // Future batches should skip captions the user has now voted on.
      votedIdsRef.current.add(captionId);
      return true;
    },
    []
  );

  // Remove a vote entirely (called from the history drawer's "unlike").
  const clearVote = useCallback(async (captionId: string) => {
    const supabase = getSupabase();
    if (!supabase) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error: deleteError } = await supabase
      .from(CAPTION_VOTES_TABLE)
      .delete()
      .eq("profile_id", user.id)
      .eq("caption_id", captionId);
    if (deleteError) {
      setVoteError(deleteError.message);
      return false;
    }
    setVoteState((prev) => {
      const next = { ...prev };
      delete next[captionId];
      return next;
    });
    // Unvoted captions become eligible to appear in the feed again on refresh.
    votedIdsRef.current.delete(captionId);
    return true;
  }, []);

  // Pointer-based swipe handlers (works for mouse, touch, pen).
  function handlePointerDown(captionId: string, clientX: number) {
    dragStartX.current[captionId] = clientX;
  }

  function handlePointerMove(captionId: string, clientX: number) {
    const start = dragStartX.current[captionId];
    if (start == null) return;
    const dx = clientX - start;
    setDragX((prev) => ({ ...prev, [captionId]: dx }));
  }

  function handlePointerEnd(captionId: string) {
    const dx = dragX[captionId] ?? 0;
    delete dragStartX.current[captionId];
    setDragX((prev) => {
      const next = { ...prev };
      delete next[captionId];
      return next;
    });
    if (!userId) return;
    if (dx >= SWIPE_THRESHOLD) {
      void upsertVote(captionId, 1);
    } else if (dx <= -SWIPE_THRESHOLD) {
      void upsertVote(captionId, -1);
    }
  }

  const canVote = !!userId;
  const isVoting = (id: string) => votingCaptionId === id;

  // Hint pill: "Swipe right to like" appears briefly the first time.
  const swipeHintShown = useMemo(() => items.length > 0 && canVote, [items.length, canVote]);

  return (
    <div className="relative">
      {/* Floating action bar — refresh + history toggle */}
      <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 bg-[var(--background)]/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)]/20 bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--foreground)]/5 disabled:opacity-50"
          aria-label="Refresh feed with unseen memes"
        >
          <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>↻</span>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)]/20 bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--foreground)]/5"
          aria-label="View liked and disliked memes"
        >
          ☰ History
        </button>
      </div>

      {voteError && (
        <div className="mx-auto mb-4 max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {voteError}
        </div>
      )}
      {error && (
        <div className="mx-auto mb-4 max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {swipeHintShown && (
        <p className="mx-auto mb-4 max-w-2xl text-center text-xs text-[var(--foreground)]/50">
          Tip: swipe a card right to upvote, left to downvote — or use the buttons.
        </p>
      )}

      {/* One-meme-at-a-time vertical feed with scroll-snap. */}
      <div className="mx-auto flex max-w-2xl flex-col gap-12 pb-16">
        {items.map(({ caption, image }) => {
          const src = imageUrl(image);
          const currentVote = voteState[caption.id];
          const dx = dragX[caption.id] ?? 0;
          const rotation = Math.max(-12, Math.min(12, dx / 16));
          const swipeOpacityHint =
            dx === 0
              ? null
              : dx > 0
                ? { color: "emerald" as const, label: "👍 LIKE" }
                : { color: "red" as const, label: "👎 PASS" };

          return (
            <article
              key={caption.id}
              className="flex min-h-[85vh] snap-start flex-col items-center justify-center"
            >
              <div
                className="relative w-full select-none overflow-hidden rounded-3xl border border-[var(--foreground)]/10 bg-[var(--background)] shadow-2xl"
                style={{
                  transform: `translateX(${dx}px) rotate(${rotation}deg)`,
                  transition: dx === 0 ? "transform 200ms ease-out" : "none",
                  touchAction: "pan-y",
                }}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  handlePointerDown(caption.id, e.clientX);
                }}
                onPointerMove={(e) => handlePointerMove(caption.id, e.clientX)}
                onPointerUp={() => handlePointerEnd(caption.id)}
                onPointerCancel={() => handlePointerEnd(caption.id)}
              >
                {/* Swipe overlay hint */}
                {swipeOpacityHint && (
                  <div
                    className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-5xl font-black tracking-wide ${
                      swipeOpacityHint.color === "emerald"
                        ? "bg-emerald-500/20 text-emerald-600"
                        : "bg-red-500/20 text-red-600"
                    }`}
                    style={{ opacity: Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD) }}
                  >
                    {swipeOpacityHint.label}
                  </div>
                )}

                <div className="relative flex w-full items-center justify-center overflow-hidden bg-[var(--foreground)]/[0.06]">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      draggable={false}
                      className="max-h-[60vh] w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center text-[var(--foreground)]/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6 border-t border-[var(--foreground)]/5 p-6 sm:p-8">
                  {/* Bigger, easier-to-read caption */}
                  <p className="text-2xl font-semibold leading-snug text-[var(--foreground)] sm:text-3xl">
                    {captionText(caption)}
                  </p>

                  <div className="flex items-center justify-center gap-4 pt-1">
                    {canVote ? (
                      <>
                        <button
                          type="button"
                          onClick={() => upsertVote(caption.id, -1)}
                          disabled={isVoting(caption.id)}
                          className={
                            "min-w-[7rem] rounded-full border px-5 py-3 text-base font-semibold transition disabled:opacity-50 " +
                            (currentVote === -1
                              ? "border-red-500/60 bg-red-500/20 text-red-700 ring-2 ring-red-500/30 dark:text-red-300"
                              : "border-[var(--foreground)]/20 bg-transparent text-[var(--foreground)]/80 hover:border-red-500/40 hover:bg-red-500/5")
                          }
                          aria-label="Downvote caption"
                        >
                          {isVoting(caption.id) ? "…" : "👎 Pass"}
                        </button>
                        <button
                          type="button"
                          onClick={() => upsertVote(caption.id, 1)}
                          disabled={isVoting(caption.id)}
                          className={
                            "min-w-[7rem] rounded-full border px-5 py-3 text-base font-semibold transition disabled:opacity-50 " +
                            (currentVote === 1
                              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-700 ring-2 ring-emerald-500/30 dark:text-emerald-300"
                              : "border-[var(--foreground)]/20 bg-transparent text-[var(--foreground)]/80 hover:border-emerald-500/40 hover:bg-emerald-500/5")
                          }
                          aria-label="Upvote caption"
                        >
                          {isVoting(caption.id) ? "…" : "👍 Funny"}
                        </button>
                      </>
                    ) : (
                      <span className="text-base text-[var(--foreground)]/60">
                        Sign in to vote
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-4" aria-hidden />
      {loading && (
        <p className="py-6 text-center text-sm text-[var(--foreground)]/50">
          Loading…
        </p>
      )}
      {!hasMore && items.length > 0 && (
        <p className="py-6 text-center text-sm text-[var(--foreground)]/50">
          You&apos;ve seen them all — try Refresh for fresh memes.
        </p>
      )}
      {!loading && items.length === 0 && !error && (
        <p className="py-12 text-center text-[var(--foreground)]/60">
          No captions yet.
        </p>
      )}

      {/* Liked / Disliked sidebar */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        userId={userId}
        voteState={voteState}
        onChangeVote={async (captionId, next) => {
          if (next == null) {
            await clearVote(captionId);
          } else {
            await upsertVote(captionId, next);
          }
        }}
      />
    </div>
  );
}
