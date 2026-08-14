"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserApi } from "@/lib/use-user-api";
import Link from "next/link";
import { Bookmark, Play, X, RefreshCw, Search } from "lucide-react";

interface SavedVideo {
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

import { formatViews } from "@/lib/format-views";

export default function SavedPage() {
  const { get, del } = useUserApi();
  const [items, setItems] = useState<SavedVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [removingUuid, setRemovingUuid] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await get("/api/user/saves?limit=100");
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const removeItem = async (uuid: string) => {
    setRemovingUuid(uuid);
    try {
      await del(`/api/user/save/${uuid}`);
      setItems(prev => prev.filter(i => i.uuid !== uuid));
      setTotal(prev => prev - 1);
    } catch {}
    setRemovingUuid(null);
  };

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(query.toLowerCase()) ||
    (i.channelName || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <Bookmark className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">Saved Videos</h1>
          {total > 0 && (
            <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">{total}</span>
          )}
        </div>
        {items.length > 0 && (
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
            <input
              type="search"
              placeholder="Search saved..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-44 rounded-xl border border-white/[0.06] bg-white/[0.04] py-2 pl-8 pr-3 text-xs text-neutral-300 placeholder-neutral-600 outline-none focus:border-violet-500/30 transition"
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1,2,3,4,5,6,7,8].map(i => (
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
          <button onClick={fetchSaved} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <Bookmark className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-200">No saved videos yet</h3>
            <p className="mt-1 text-sm text-neutral-500">Save videos to watch later.</p>
          </div>
          <Link href="/" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95">
            Browse Videos
          </Link>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && items.length > 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">No results for &quot;{query}&quot;</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map(v => (
            <div key={v.uuid} className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-violet-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-200">
              <Link href={`/watch/${v.slug}`}>
                <div className="relative aspect-video overflow-hidden rounded-t-xl bg-neutral-900">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-violet-900/30">
                      <Play className="h-8 w-8 text-violet-400/40" />
                    </div>
                  )}
                  {v.duration && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {formatDuration(v.duration)}
                    </span>
                  )}
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
                    {formatViews(v.sourceViews || v.views, "views")}
                  </span>
                </div>
              </div>
              {/* Remove button */}
              <button
                onClick={() => removeItem(v.uuid)}
                disabled={removingUuid === v.uuid}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-neutral-400 opacity-0 transition hover:text-red-400 group-hover:opacity-100 active:scale-90 disabled:opacity-50"
                title="Remove from saved"
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
