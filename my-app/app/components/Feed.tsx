"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { Caption, CaptionVoteInsert, Image } from "@/src/types/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

const CAPTIONS_TABLE = "captions";
const IMAGES_TABLE = "images";
const CAPTION_VOTES_TABLE = "caption_votes";
const BATCH_SIZE = 20;

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
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadBatch = useCallback(
    async (from: number) => {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Supabase not configured.");
        return;
      }
      setLoading(true);
      setError(null);

      const { data: rows, error: captionsError } = await supabase
        .from(CAPTIONS_TABLE)
        .select("*, images!inner(*)")
        .range(from, from + BATCH_SIZE - 1)
        .order("id", { ascending: true });

      if (captionsError) {
        setError(captionsError.message);
        setLoading(false);
        return;
      }
      if (!rows?.length) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      type Row = Caption & { images: Image | null };
      const newItems: FeedItem[] = (rows as Row[])
        .map((row) => {
          const { images, ...caption } = row;
          return { caption, image: images ?? null };
        })
        .filter((item): item is FeedItem => item.image != null);

      const captionIds = newItems.map((item) => item.caption.id);

      let voteMap: Record<string, 1 | -1> = {};
      if (userId && captionIds.length > 0) {
        const { data: votes } = await supabase
          .from(CAPTION_VOTES_TABLE)
          .select("caption_id, vote_value")
          .eq("profile_id", userId)
          .in("caption_id", captionIds);
        for (const v of votes ?? []) {
          const val = v.vote_value;
          if (val === 1 || val === -1) voteMap[v.caption_id] = val;
        }
      }

      setItems((prev) => (from === 0 ? newItems : [...prev, ...newItems]));
      setVoteState((prev) => ({ ...prev, ...voteMap }));
      setOffset(from + newItems.length);
      setHasMore(newItems.length === BATCH_SIZE);
      setLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    loadBatch(0);
  }, [loadBatch]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadBatch(offset);
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, offset, loadBatch]);

  async function handleVote(captionId: string, vote: 1 | -1) {
    const supabase = getSupabase();
    if (!supabase) {
      setVoteError("Supabase not configured.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setVoteError("Sign in to vote.");
      return;
    }
    setVoteError(null);
    setVotingCaptionId(captionId);
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from(CAPTION_VOTES_TABLE)
      .select("id")
      .eq("profile_id", user.id)
      .eq("caption_id", captionId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from(CAPTION_VOTES_TABLE)
        .update({ vote_value: vote, modified_datetime_utc: now })
        .eq("profile_id", user.id)
        .eq("caption_id", captionId);
      setVotingCaptionId(null);
      if (updateError) {
        setVoteError(updateError.message);
        return;
      }
    } else {
      const row: CaptionVoteInsert = {
        caption_id: captionId,
        profile_id: user.id,
        vote_value: vote,
        created_datetime_utc: now,
        modified_datetime_utc: now,
      };
      const { error: insertError } = await supabase
        .from(CAPTION_VOTES_TABLE)
        .insert(row);
      setVotingCaptionId(null);
      if (insertError) {
        setVoteError(insertError.message);
        return;
      }
    }
    setVoteState((prev) => ({ ...prev, [captionId]: vote }));
  }

  const canVote = !!userId;
  const isVoting = (id: string) => votingCaptionId === id;

  const voteBtnBase =
    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 ";
  const voteBtnDefault =
    "border-[var(--foreground)]/20 bg-transparent text-[var(--foreground)]/80 hover:bg-[var(--foreground)]/5 hover:border-[var(--foreground)]/30";
  const upvoteSelected =
    "border-emerald-500/60 bg-emerald-500/20 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300";
  const downvoteSelected =
    "border-red-500/60 bg-red-500/20 text-red-700 ring-1 ring-red-500/30 dark:text-red-300";

  return (
    <div className="mx-auto max-w-6xl px-1">
      {voteError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {voteError}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ caption, image }) => {
          const src = imageUrl(image);
          const currentVote = voteState[caption.id];
          return (
            <article
              key={caption.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[var(--foreground)]/10 bg-[var(--background)] shadow-lg transition-shadow duration-200 hover:shadow-xl"
            >
              <div className="relative flex min-h-[140px] w-full items-center justify-center overflow-hidden bg-[var(--foreground)]/[0.06]">
                {src ? (
                  <img
                    src={src}
                    alt=""
                    className="max-h-[45vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center text-[var(--foreground)]/40">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 border-t border-[var(--foreground)]/5 p-4">
                <p className="text-[15px] leading-snug text-[var(--foreground)]/90">
                  {captionText(caption)}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {canVote ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleVote(caption.id, 1)}
                        disabled={isVoting(caption.id)}
                        className={
                          voteBtnBase +
                          (currentVote === 1 ? upvoteSelected : voteBtnDefault)
                        }
                      >
                        {isVoting(caption.id) ? "…" : "↑ Upvote"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote(caption.id, -1)}
                        disabled={isVoting(caption.id)}
                        className={
                          voteBtnBase +
                          (currentVote === -1 ? downvoteSelected : voteBtnDefault)
                        }
                      >
                        {isVoting(caption.id) ? "…" : "↓ Downvote"}
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--foreground)]/50">
                      Sign in to vote
                    </span>
                  )}
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
          End of feed
        </p>
      )}
      {!loading && items.length === 0 && !error && (
        <p className="py-12 text-center text-[var(--foreground)]/60">
          No captions yet.
        </p>
      )}
    </div>
  );
}
