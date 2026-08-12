"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";

type Video = {
  id?: number;
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  duration?: number;
  views?: number;
  sourceViews?: string | null;
  channelName?: string | null;
  channelLogo?: string | null;
  status?: string;
  createdAt?: string;
};

function formatViews(views?: number | string | null) {
  if (views == null) return "0 views";
  if (typeof views === "string") {
    return views.toLowerCase().includes("view") ? views : `${views} views`;
  }
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PAGE_SIZE = 8;

export default function ManageStreamLinksPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "views">("newest");
  const [page, setPage] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const workerBase = process.env.NEXT_PUBLIC_WORKER_URL;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/admin/stream-links`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error(err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, apiBase]);

  const filtered = useMemo(() => {
    let list = [...videos];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.title?.toLowerCase().includes(q) ||
          v.channelName?.toLowerCase().includes(q)
      );
    }
    if (sort === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    } else if (sort === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );
    } else if (sort === "views") {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    return list;
  }, [videos, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyStreamLink = async (uuid: string) => {
    if (!workerBase) return;
    const link = `${workerBase}/api/media?uuid=${uuid}`;
    await navigator.clipboard.writeText(link);
    flashCopied(`stream-${uuid}`);
  };

  const copySignedLink = async (uuid: string) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/videos/${uuid}/signed-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expiresIn: 6 * 60 * 60 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await navigator.clipboard.writeText(data.url);
      flashCopied(`signed-${uuid}`);
    } catch (err) {
      console.error(err);
      // fallback: normal stream link
      await copyStreamLink(uuid);
      flashCopied(`signed-${uuid}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Manage Stream Links
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          Manage, copy, and open secure streaming links for all hosted videos.
        </p>
      </div>

      {/* Search + sort */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos by title or channel..."
            className="w-full rounded-2xl border border-violet-300/80 bg-white py-3 pl-11 pr-4 text-sm outline-none ring-violet-500/20 focus:ring-2 dark:border-violet-500/30 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="views">Sort: Views</option>
          </select>
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-[20px] bg-white dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rounded-[20px] border border-black/[0.04] bg-white py-20 text-center dark:border-white/10 dark:bg-zinc-900">
          <p className="text-sm text-neutral-500">No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {pageItems.map((video, i) => {
            const streamCopied = copiedKey === `stream-${video.uuid}`;
            const signedCopied = copiedKey === `signed-${video.uuid}`;

            return (
              <motion.article
                key={video.uuid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex flex-col overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-neutral-100 dark:bg-zinc-800">
                  {video.thumbnail ? (
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 25vw"
                    />
                  ) : null}
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(video.duration || 0)}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-3.5">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 dark:text-white">
                    {video.title}
                  </h3>

                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20">
                      {video.channelLogo ? (
                        <Image
                          src={video.channelLogo}
                          alt=""
                          width={24}
                          height={24}
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        (video.channelName || "?").charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {video.channelName || "Unknown"}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {formatViews(video.sourceViews || video.views)}
                        {video.createdAt
                          ? ` · ${formatDate(video.createdAt)}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyStreamLink(video.uuid)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition",
                        streamCopied
                          ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                          : "border border-black/5 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-950 dark:text-neutral-300 dark:hover:bg-white/5"
                      )}
                    >
                      {streamCopied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Stream Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => copySignedLink(video.uuid)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl border border-black/5 px-2.5 py-1.5 text-[11px] font-semibold transition dark:border-white/10",
                        signedCopied
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-zinc-950 dark:text-neutral-300"
                      )}
                    >
                      {signedCopied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        "Copy Signed Link"
                      )}
                    </button>

                    <Link
                      href={`/watch/${video.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl border border-black/5 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-950 dark:text-neutral-300"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-neutral-400">
            Showing {(pageSafe - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(pageSafe * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} results
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-black/5 p-2 text-neutral-500 disabled:opacity-40 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
              const n = idx + 1;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "h-8 min-w-[2rem] rounded-xl px-2 text-sm font-medium",
                    pageSafe === n
                      ? "bg-violet-600 text-white"
                      : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  {n}
                </button>
              );
            })}

            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-black/5 p-2 text-neutral-500 disabled:opacity-40 dark:border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
