"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserApi } from "@/lib/use-user-api";
import Link from "next/link";
import { Heart, Play, X, RefreshCw } from "lucide-react";

interface LikedVideo {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  sourceViews?: string;
  channelName?: string;
  channelLogo?: string;
}

function formatDuration(sec?: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(views?: number, sourceViews?: string) {
  const v = views || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return sourceViews || v.toString();
}

export default function LikedPage() {
  const { get, del } = useUserApi();
  const [items, setItems] = useState<LikedVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingUuid, setRemovingUuid] = useState<string | null>(null);

  const fetchLiked = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await get("/api/user/likes?limit=100");
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchLiked(); }, [fetchLiked]);

  const unlike = async (uuid: string) => {
    setRemovingUuid(uuid);
    try {
      await del(`/api/user/like/${uuid}`);
      setItems(prev => prev.filter(i => i.uuid !== uuid));
      setTotal(prev => prev - 1);
    } catch {}
    setRemovingUuid(null);
  };

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <Heart className="h-5 w-5 text-red-400" />
        <h1 className="text-lg font-bold text-white">Liked Videos</h1>
        {total > 0 && (
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">{total}</span>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1,2,3,4,5,6].map(i => (
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
          <button onClick={fetchLiked} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <Heart className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-200">No liked videos yet</h3>
            <p className="mt-1 text-sm text-neutral-500">Like videos to keep them here.</p>
          </div>
          <Link href="/" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95">
            Browse Videos
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(v => (
            <div key={v.uuid} className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-red-500/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/10 transition-all duration-200">
              <Link href={`/watch/${v.slug}`}>
                <div className="relative aspect-video overflow-hidden rounded-t-xl bg-neutral-900">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-red-900/20">
                      <Play className="h-8 w-8 text-red-400/40" />
                    </div>
                  )}
                  {v.duration && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {formatDuration(v.duration)}
                    </span>
                  )}
                  {/* Heart badge */}
                  <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80">
                    <Heart className="h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
                  </span>
                </div>
              </Link>
              <div className="p-2.5">
                <Link href={`/watch/${v.slug}`}>
                  <p className="line-clamp-2 text-xs font-semibold text-neutral-200 hover:text-white transition leading-snug">{v.title}</p>
                </Link>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {v.channelLogo && <img src={v.channelLogo} alt="" className="h-3.5 w-3.5 rounded-full" />}
                  <p className="truncate text-[10px] text-neutral-500">{v.channelName || "Unknown"}</p>
                  <span className="ml-auto flex-shrink-0 text-[10px] text-neutral-600">
                    {formatViews(v.views, v.sourceViews)} views
                  </span>
                </div>
              </div>
              <button
                onClick={() => unlike(v.uuid)}
                disabled={removingUuid === v.uuid}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-neutral-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100 active:scale-90 disabled:opacity-50"
                title="Unlike"
              >
                {removingUuid === v.uuid ? <RefreshCw className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
