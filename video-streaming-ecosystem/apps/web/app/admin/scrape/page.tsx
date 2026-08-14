"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MagnifyingGlassPlus as ScrapeIcon,
  CircleNotch,
  CheckCircle,
  XCircle,
  DownloadSimple as SaveIcon,
  CheckSquare as CheckedIcon,
  Square as UncheckedIcon,
  Clock,
  Eye,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { cn, formatDuration } from "@/lib/utils";

type ScrapedItem = {
  url?: string;
  source_page_url?: string;
  title: string;
  uuid: string;
  slug: string;
  thumbnail?: string | null;
  duration?: number;
  channel_name?: string | null;
  channel_logo?: string | null;
  selected: boolean;
};

export default function AdminScrapePage() {
  const { token } = useAuth();
  const [url, setUrl] = useState("");
  const [maxVideos, setMaxVideos] = useState(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [results, setResults] = useState<ScrapedItem[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setResults([]);

    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/scrape/listing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ url: url.trim(), max_videos: maxVideos }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Scrape failed");

      if (Array.isArray(data.results)) {
        setResults(data.results.map((item: any) => ({ ...item, selected: true })));
        setSelectAll(true);
        setSuccessMsg(`Successfully scraped ${data.results.length} videos from target URL.`);
      } else if (data.uuid) {
        setResults([{ ...data, selected: true }]);
        setSelectAll(true);
        setSuccessMsg("1 video metadata extracted.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to scraper service.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (uuid: string) => {
    setResults((prev) =>
      prev.map((r) => (r.uuid === uuid ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleSelectAll = () => {
    const nextVal = !selectAll;
    setSelectAll(nextVal);
    setResults((prev) => prev.map((r) => ({ ...r, selected: nextVal })));
  };

  const selectedCount = useMemo(() => results.filter((r) => r.selected).length, [results]);

  const handleSaveSelected = async () => {
    const selectedVideos = results.filter((r) => r.selected);
    if (!selectedVideos.length) return;

    setSaving(true);
    setError(null);
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/save-scraped-videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ videos: selectedVideos }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save videos");

      setSuccessMsg(`Successfully saved ${data.savedCount || selectedCount} videos directly into database!`);
    } catch (err: any) {
      setError(err.message || "Error saving selected videos to database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Scrape Videos Portal</h1>
        <p className="mt-1 text-xs text-neutral-400">Extract video metadata batches and save directly into Lumenstream MySQL database.</p>
      </div>

      {/* Input Form Card */}
      <form onSubmit={handleScrape} className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300">Target Source Page or Category URL</label>
          <div className="relative">
            <input
              type="url"
              required
              placeholder="e.g. https://xhamster.com/categories/trending"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-neutral-300">Max Videos to Extract:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxVideos}
              onChange={(e) => setMaxVideos(Number(e.target.value))}
              className="w-20 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-center text-xs font-bold text-white outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-600/25 shrink-0"
          >
            {loading ? (
              <>
                <CircleNotch className="h-4 w-4 animate-spin" /> Extracting Videos...
              </>
            ) : (
              <>
                <ScrapeIcon className="h-4 w-4" /> Start Scraping
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error / Success Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-xs font-bold text-red-400">
          <XCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-400">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Scraped Results Selection Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-black transition"
              >
                {selectAll ? <CheckedIcon className="h-4 w-4 text-violet-400" /> : <UncheckedIcon className="h-4 w-4 text-neutral-400" />}
                {selectAll ? "Deselect All" : "Select All"}
              </button>
              <p className="text-xs text-neutral-400">
                <span className="font-bold text-white">{selectedCount}</span> of {results.length} videos selected
              </p>
            </div>

            <button
              onClick={handleSaveSelected}
              disabled={saving || selectedCount === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/25"
            >
              {saving ? (
                <>
                  <CircleNotch className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4" /> Save {selectedCount} Selected Videos
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {results.map((r) => (
              <div
                key={r.uuid}
                onClick={() => toggleSelect(r.uuid)}
                className={cn(
                  "cursor-pointer group relative flex flex-col overflow-hidden rounded-2xl border p-3 transition duration-200",
                  r.selected ? "border-violet-500 bg-violet-600/10" : "border-white/[0.08] bg-black/40 opacity-60 hover:opacity-100"
                )}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-900">
                  {r.thumbnail ? (
                    <Image src={r.thumbnail} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-600">No Thumb</div>
                  )}
                  <span className="absolute top-2 left-2 rounded-lg bg-black/80 p-1 text-white">
                    {r.selected ? <CheckedIcon className="h-4 w-4 text-violet-400" /> : <UncheckedIcon className="h-4 w-4 text-neutral-400" />}
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {formatDuration(r.duration || 0)}
                  </span>
                </div>

                <div className="mt-2.5 flex-1 flex flex-col justify-between">
                  <h4 className="line-clamp-2 text-xs font-bold text-white">{r.title}</h4>
                  <p className="mt-1 truncate text-[10px] text-neutral-400">{r.channel_name || "Unknown Channel"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
