"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search as SearchIcon, Filter, X } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { VideoCardSkeleton } from "@/components/video-card-skeleton";
import { cn } from "@/lib/utils";

type SortKey = "relevance" | "latest" | "views";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = (searchParams.get("q") || "").trim();

  const [input, setInput] = useState(qParam);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    setInput(qParam);
  }, [qParam]);

  useEffect(() => {
    if (!qParam) {
      setVideos([]);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const sortParam =
          sort === "views" ? "trending" : sort === "latest" ? "latest" : "latest";
        const res = await fetch(
          `${apiBase}/api/videos?q=${encodeURIComponent(qParam)}&limit=48&sort=${sortParam}`
        );
        const json = await res.json();
        let list = json.data || [];

        // Client-side relevance boost: title match first
        if (sort === "relevance") {
          const ql = qParam.toLowerCase();
          list = [...list].sort((a, b) => {
            const as = (a.title || "").toLowerCase().includes(ql) ? 1 : 0;
            const bs = (b.title || "").toLowerCase().includes(ql) ? 1 : 0;
            if (bs !== as) return bs - as;
            return (b.views || 0) - (a.views || 0);
          });
        }

        setVideos(list);
      } catch (err) {
        console.error(err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [qParam, sort, apiBase]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = input.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  const resultLabel = useMemo(() => {
    if (!qParam) return null;
    if (loading) return "Searching…";
    return `About ${videos.length.toLocaleString()} result${
      videos.length === 1 ? "" : "s"
    }`;
  }, [qParam, loading, videos.length]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
              Search results
            </h1>
            {qParam ? (
              <>
                <p className="mt-2 text-sm text-neutral-500">
                  Showing results for{" "}
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    “{qParam}”
                  </span>
                </p>
                <p className="mt-1 text-xs text-neutral-400">{resultLabel}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">
                Type a keyword to find videos across the library.
              </p>
            )}
          </div>

          {/* Filter / sort */}
          {qParam && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-black/5 bg-white px-3.5 py-2 text-sm font-medium text-neutral-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300"
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-2xl border border-black/5 bg-white px-3.5 py-2 text-sm font-medium text-neutral-600 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300"
              >
                <option value="relevance">Sort by: Relevance</option>
                <option value="latest">Sort by: Newest</option>
                <option value="views">Sort by: Views</option>
              </select>
            </div>
          )}
        </div>

        {/* Inline search (mobile / refine) */}
        <form onSubmit={submitSearch} className="mb-8">
          <div className="relative max-w-xl">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search videos, titles, channels..."
              className="w-full rounded-2xl border border-black/5 bg-white/80 py-3 pl-11 pr-10 text-sm shadow-sm outline-none ring-violet-500/20 backdrop-blur-xl focus:ring-2 dark:border-white/10 dark:bg-zinc-900/80 dark:text-white"
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* States */}
        {!qParam ? (
          <EmptySearch
            title="Start searching"
            subtitle="Use the search box to find videos by title or channel."
            ctaLabel="Go to Home"
            ctaHref="/"
          />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptySearch
            title={`No results for “${qParam}”`}
            subtitle="We couldn't find any videos matching your search. Try different keywords or check your spelling."
            ctaLabel="Try another search"
            onCta={() => {
              setInput("");
              router.push("/search");
            }}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {videos.map((video) => (
              <VideoCard key={video.uuid} video={video} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EmptySearch({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  onCta,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref?: string;
  onCta?: () => void;
}) {
  const btnClass =
    "mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700";

  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-black/5 bg-white/80 px-6 py-20 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
        <SearchIcon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
        {title.includes("“") ? (
          <>
            {title.slice(0, title.indexOf("“"))}
            <span className="text-violet-600 dark:text-violet-400">
              {title.slice(title.indexOf("“"))}
            </span>
          </>
        ) : (
          title
        )}
      </h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">{subtitle}</p>
      {ctaHref ? (
        <Link href={ctaHref} className={btnClass}>
          <SearchIcon className="h-4 w-4" />
          {ctaLabel}
        </Link>
      ) : (
        <button type="button" onClick={onCta} className={btnClass}>
          <SearchIcon className="h-4 w-4" />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
