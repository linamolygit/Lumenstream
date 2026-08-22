"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserApi } from "@/lib/use-user-api";
import Link from "next/link";
import {
  ClockCounterClockwise as History,
  Play,
  Trash,
  ArrowsClockwise as RefreshCw,
  X,
  ArrowCounterClockwise as RotateCcw,
} from "@phosphor-icons/react";

interface HistoryItem {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  sourceViews?: string;
  channelName?: string;
  channelLogo?: string;
  progressSec: number;
  durationSec: number;
  watchedAt: string;
}

function formatDuration(sec?: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function formatRelativeDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(items: HistoryItem[]): Record<string, HistoryItem[]> {
  const groups: Record<string, HistoryItem[]> = {};
  for (const item of items) {
    const key = formatRelativeDate(item.watchedAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function HistoryPage() {
  const { get, del, authReady } = useUserApi();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [removingUuid, setRemovingUuid] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await get("/api/user/history?limit=100");
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { if (authReady) fetchHistory(); }, [authReady, fetchHistory]);

  const removeItem = async (uuid: string) => {
    setRemovingUuid(uuid);
    try {
      await del(`/api/user/history/${uuid}`);
      setItems(prev => prev.filter(i => i.uuid !== uuid));
      setTotal(prev => prev - 1);
    } catch {}
    setRemovingUuid(null);
  };

  const clearAll = async () => {
    if (!confirm("Clear your entire watch history?")) return;
    setClearing(true);
    try {
      await del("/api/user/history");
      setItems([]);
      setTotal(0);
    } catch {}
    setClearing(false);
  };

  const groups = groupByDate(items);

  return (
    <div className="min-h-full p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <History className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">Watch History</h1>
          {total > 0 && (
            <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
              {total}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            disabled={clearing}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
          >
            {clearing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
            Clear All
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i}>
              <div className="mb-3 h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
              {[1, 2, 3].map(j => (
                <div key={j} className="mb-2 h-20 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-neutral-500">{error}</p>
          <button onClick={fetchHistory} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <History className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-200">No watch history yet</h3>
            <p className="mt-1 text-sm text-neutral-500">Videos you watch will appear here.</p>
          </div>
          <Link href="/" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95">
            Browse Videos
          </Link>
        </div>
      )}

      {!loading && !error && Object.entries(groups).map(([date, group]) => (
        <div key={date} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">{date}</h2>
          <div className="space-y-2">
            {group.map(item => {
              const pct = item.durationSec > 0 ? Math.min((item.progressSec / item.durationSec) * 100, 100) : 0;
              return (
                <div key={item.uuid} className="group flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 hover:border-violet-500/20 hover:bg-white/[0.04] transition-all">
                  <Link href={`/watch/${item.slug}`} className="relative flex-shrink-0">
                    <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-neutral-900">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-violet-900/30">
                          <Play className="h-5 w-5 text-violet-400/50" />
                        </div>
                      )}
                      {item.durationSec > 0 && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-medium text-white">
                          {formatDuration(item.durationSec)}
                        </span>
                      )}
                    </div>
                    {pct > 0 && (
                      <div className="mt-0.5 h-0.5 w-full rounded-full bg-neutral-800">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/watch/${item.slug}`}>
                      <p className="line-clamp-2 text-sm font-medium text-neutral-200 hover:text-white transition">
                        {item.title}
                      </p>
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                      {item.channelLogo && (
                        <img src={item.channelLogo} alt="" className="h-3 w-3 rounded-full" />
                      )}
                      {item.channelName}
                      {pct > 0 && <span className="ml-1 text-violet-400">{Math.round(pct)}% watched</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.uuid)}
                    disabled={removingUuid === item.uuid}
                    className="flex-shrink-0 rounded-lg p-2 text-neutral-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 active:scale-90 disabled:opacity-50"
                    title="Remove from history"
                  >
                    {removingUuid === item.uuid ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
