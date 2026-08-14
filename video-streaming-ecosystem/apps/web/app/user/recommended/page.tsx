"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserApi } from "@/lib/use-user-api";
import Link from "next/link";
import { Sparkle as Sparkles, Play, ArrowsClockwise as RefreshCw } from "@phosphor-icons/react";

interface RecoVideo {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  sourceViews?: string;
  channelName?: string;
  channelLogo?: string;
  score?: number;
}

function formatDuration(sec?: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

import { formatViews } from "@/lib/format-views";

export default function RecommendedPage() {
  const { get } = useUserApi();
  const [items, setItems] = useState<RecoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReco = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await get("/api/user/recommended?limit=48");
      setItems(d.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchReco(); }, [fetchReco]);

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">Recommended For You</h1>
        </div>
        <button
          onClick={fetchReco}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="mb-4 text-xs text-neutral-600">
        Based on your watch history and liked videos · Updated in real-time
      </p>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white/[0.04]">
              <div className="aspect-video rounded-t-xl bg-white/[0.06]" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.06]" />
                <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-neutral-500">{error}</p>
          <button onClick={fetchReco} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-200">Watch more to get recommendations</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Your personalized feed improves with your watch history.
            </p>
          </div>
          <Link href="/" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95">
            Browse Videos
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(v => (
            <Link
              key={v.uuid}
              href={`/watch/${v.slug}`}
              className="group overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-violet-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-200"
            >
              <div className="relative aspect-video overflow-hidden bg-neutral-900">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-indigo-900/40">
                    <Play className="h-8 w-8 text-violet-400/40" />
                  </div>
                )}
                {v.duration && (
                  <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatDuration(v.duration)}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-xs font-semibold text-neutral-200 group-hover:text-white transition leading-snug">{v.title}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {v.channelLogo && <img src={v.channelLogo} alt="" className="h-3.5 w-3.5 rounded-full" />}
                  <p className="truncate text-[10px] text-neutral-500">{v.channelName || "Unknown"}</p>
                  <span className="ml-auto flex-shrink-0 text-[10px] text-neutral-600">
                    {formatViews(v.sourceViews || v.views, "views")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
