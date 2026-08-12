"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Sparkles,
  Loader2,
  Minus,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  ExternalLink,
  LayoutList,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn, formatDuration } from "@/lib/utils";

type Mode = "single" | "listing";

type ResultItem = {
  url?: string;
  title?: string;
  uuid?: string;
  slug?: string;
  status: string; // scraped | already_exists | failed | success | error
  thumbnail?: string | null;
  duration?: number;
  message?: string;
};

function shortUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return (u.host + u.pathname + u.search).slice(0, 48);
  } catch {
    return url.slice(0, 48);
  }
}

function StatusBadge({ status, message }: { status: string; message?: string }) {
  const s = status.toLowerCase();
  if (s === "scraped" || s === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Success
      </span>
    );
  }
  if (s === "already_exists") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        <Clock className="h-3.5 w-3.5" /> Already exists
      </span>
    );
  }
  if (s === "failed" || s === "error") {
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
          <XCircle className="h-3.5 w-3.5" /> Error
        </span>
        {message && (
          <span className="text-[10px] text-red-400">{message}</span>
        )}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500 dark:bg-white/10">
      {status}
    </span>
  );
}

export default function AdminScrapePage() {
  const { token } = useAuth();

  const [mode, setMode] = useState<Mode>("listing");
  const [url, setUrl] = useState("");
  const [maxVideos, setMaxVideos] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !token) return;

    setLoading(true);
    setError(null);
    setMessage(null);
    setResults([]);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    try {
      const endpoint =
        mode === "single" ? "/api/admin/scrape" : "/api/admin/scrape/listing";

      const body =
        mode === "single"
          ? { url: url.trim() }
          : { url: url.trim(), max_videos: maxVideos };

      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Scrape failed");

      if (Array.isArray(data.results)) {
        setResults(data.results);
        setMessage(data.message || `Processed ${data.results.length} videos`);
      } else if (data.uuid) {
        setResults([
          {
            uuid: data.uuid,
            slug: data.slug,
            title: data.title,
            url: url.trim(),
            status: "scraped",
            thumbnail: data.thumbnail,
            duration: data.duration,
          },
        ]);
        setMessage(data.message || "1 video scraped");
      } else {
        setMessage(data.message || "Done");
      }

      setUrl("");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError(
          "Scraper is waking up or taking too long. Try again in a minute."
        );
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!results.length) return;
    const rows = [
      ["title", "url", "uuid", "status", "duration"],
      ...results.map((r) => [
        r.title || "",
        r.url || "",
        r.uuid || "",
        r.status || "",
        String(r.duration || ""),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lumenstream-scrape-${Date.now()}.csv`;
    a.click();
  };

  const successCount = useMemo(
    () =>
      results.filter((r) => ["scraped", "success"].includes(r.status)).length,
    [results]
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Scrape Videos
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          Scrape videos from a single URL or a listing page and add them to the
          platform.
        </p>
      </div>

      {/* Form card */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleScrape}
        className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-6"
      >
        {/* Mode toggle */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Mode
          </p>
          <div className="inline-flex rounded-2xl border border-black/5 bg-[#F7F8FC] p-1 dark:border-white/10 dark:bg-black/20">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition",
                mode === "single"
                  ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-800 dark:text-violet-300"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              )}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode("listing")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition",
                mode === "listing"
                  ? "bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Listing
            </button>
          </div>
        </div>

        {/* URL input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {mode === "single" ? "Video URL" : "Listing URL"}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-white/5">
              <Link2 className="h-4 w-4" />
            </span>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mode === "single"
                  ? "Paste a single video URL (e.g. https://example.com/video/...)"
                  : "Paste a channel or listing URL (e.g. https://example.com/videos)"
              }
              className="w-full rounded-2xl border border-violet-300/70 bg-white py-3.5 pl-[3.25rem] pr-4 text-sm outline-none ring-violet-500/20 focus:ring-2 dark:border-violet-500/30 dark:bg-black/20 dark:text-white"
            />
          </div>
        </div>

        {/* Max videos — listing only */}
        {mode === "listing" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F7F8FC] px-4 py-3 dark:border-white/10 dark:bg-black/20">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Max videos
              </p>
              <p className="text-xs text-neutral-400">
                Limit the number of videos to scrape from the listing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMaxVideos((n) => Math.max(1, n - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/5 bg-white hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums dark:text-white">
                {maxVideos}
              </span>
              <button
                type="button"
                onClick={() => setMaxVideos((n) => Math.min(100, n + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/5 bg-white hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-neutral-400">
          First request may take 60–90s if the scraper was asleep (free hosting).
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              Start Scrape
            </>
          )}
        </button>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Error
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                  {error}
                </p>
              </div>
            </motion.div>
          )}

          {message && !error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Scrape finished
                </p>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
                  {message}
                  {results.length > 0 && ` · ${successCount} new`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>

      {/* Results table */}
      {results.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] px-5 py-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Scrape Results
              </h2>
              <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                {results.length} results
              </span>
            </div>
            <button
              type="button"
              onClick={exportResults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/5 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-950 dark:text-neutral-300 dark:hover:bg-zinc-900"
            >
              <Download className="h-3.5 w-3.5" />
              Export Results
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden grid-cols-12 gap-3 border-b border-black/[0.04] px-5 py-2.5 text-xs font-medium text-neutral-400 dark:border-white/10 md:grid">
            <div className="col-span-6">Video</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Source</div>
          </div>

          <ul className="divide-y divide-black/[0.04] dark:divide-white/5">
            {results.map((item, i) => (
              <li
                key={item.uuid || item.url || i}
                className="grid grid-cols-1 items-center gap-3 px-5 py-3 md:grid-cols-12"
              >
                {/* Video */}
                <div className="flex items-center gap-3 md:col-span-6">
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-zinc-800">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : null}
                    {!!item.duration && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] text-white">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                      {item.title || "Untitled"}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-neutral-400 hover:text-violet-600"
                      >
                        {shortUrl(item.url)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="text-sm text-neutral-500 md:col-span-2">
                  {item.duration ? formatDuration(item.duration) : "—"}
                </div>

                {/* Status */}
                <div className="md:col-span-2">
                  <StatusBadge status={item.status} message={item.message} />
                </div>

                {/* Watch link */}
                <div className="md:col-span-2">
                  {item.slug || item.uuid ? (
                    <Link
                      href={`/watch/${item.slug || item.uuid}`}
                      className="text-xs font-medium text-violet-600 hover:underline"
                    >
                      Open on site
                    </Link>
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-black/[0.04] px-5 py-3 text-xs text-neutral-400 dark:border-white/10">
            Showing 1 to {results.length} of {results.length} results
          </div>
        </motion.section>
      )}
    </div>
  );
}
