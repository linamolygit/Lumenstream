"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Minus,
  Plus,
  Info,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn, formatDuration } from "@/lib/utils";

type ResultItem = {
  url?: string;
  title?: string;
  uuid?: string;
  slug?: string;
  status: string;
  thumbnail?: string | null;
  duration?: number;
};

function shortUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return (u.host + path).slice(0, 52);
  } catch {
    return url.slice(0, 52);
  }
}

export default function AddVideoPage() {
  const { token } = useAuth();

  const [url, setUrl] = useState("");
  const [maxVideos, setMaxVideos] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim(), max_videos: maxVideos }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Scrape failed");

      if (Array.isArray(data.results)) {
        setResults(data.results);
        const scraped = data.results.filter((r: ResultItem) => r.status === "scraped").length;
        setMessage(data.message || `${scraped} video(s) processed`);
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
        setMessage(data.message || "1 video scraped successfully");
      } else {
        setMessage(data.message || "Done");
      }

      setUrl("");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Scraper is waking up or taking too long. Please try again in a minute.");
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Add Video
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          Enter a single video URL or a homepage / listing URL to scrape multiple videos.
        </p>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleScrape}
        className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-6"
      >
        {/* Large URL input */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-white/5">
            <Link2 className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL or listing URL (e.g. https://example.com/videos)"
            className="w-full rounded-2xl border border-black/5 bg-[#F7F8FC] py-3.5 pl-[3.25rem] pr-4 text-sm outline-none ring-violet-500/25 transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-zinc-900"
          />
        </div>

        {/* Max videos + note */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-[#F7F8FC] px-4 py-3 dark:border-white/10 dark:bg-black/20">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                Max videos
              </p>
              <p className="text-xs text-neutral-400">
                Limit the number of videos to scrape.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMaxVideos((n) => Math.max(1, n - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/5 bg-white text-neutral-600 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300 dark:hover:bg-zinc-800"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums dark:text-white">
                {maxVideos}
              </span>
              <button
                type="button"
                onClick={() => setMaxVideos((n) => Math.min(50, n + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/5 bg-white text-neutral-600 transition hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300 dark:hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            First request may take 60–90s.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
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

          {loading && (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm text-neutral-500 dark:border-white/10 dark:bg-zinc-900">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              Scraping in progress…
            </span>
          )}
        </div>

        {/* Feedback alerts */}
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
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Error</p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">{error}</p>
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
                  Scraping complete
                </p>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">{message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>

      {/* Results */}
      {results.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Results</h2>
            <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              {results.length} video{results.length !== 1 ? "s" : ""} found
            </span>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <ul className="divide-y divide-black/[0.04] dark:divide-white/5">
              {results.map((item, i) => {
                const scraped = item.status === "scraped";
                const exists = item.status === "already_exists";
                const failed = item.status === "failed";
                const href = item.slug
                  ? `/watch/${item.slug}`
                  : item.uuid
                  ? `/watch/${item.uuid}`
                  : null;

                return (
                  <li
                    key={item.uuid || item.url || i}
                    className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-zinc-800">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                          No img
                        </div>
                      )}
                      {!!item.duration && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] text-white">
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                        {item.title || "Untitled video"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">
                        {shortUrl(item.url)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        scraped && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        exists && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                        failed && "bg-red-500/10 text-red-600 dark:text-red-400",
                        !scraped &&
                          !exists &&
                          !failed &&
                          "bg-neutral-100 text-neutral-500 dark:bg-white/10"
                      )}
                    >
                      {(scraped || exists) && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {scraped
                        ? "Scraped"
                        : exists
                        ? "Already exists"
                        : failed
                        ? "Failed"
                        : item.status}
                    </span>

                    {/* Open link */}
                    {href ? (
                      <Link
                        href={href}
                        className="hidden rounded-xl p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 dark:hover:bg-white/5 sm:inline-flex"
                        title="Open video"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span className="hidden p-2 text-neutral-300 sm:inline-flex">
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-3 text-center text-xs text-neutral-400">
            Videos also appear in{" "}
            <Link
              href="/dashboard/my-videos"
              className="font-medium text-violet-600 hover:underline"
            >
              My Videos
            </Link>{" "}
            and on the public Home feed when active.
          </p>
        </motion.section>
      )}
    </div>
  );
}
