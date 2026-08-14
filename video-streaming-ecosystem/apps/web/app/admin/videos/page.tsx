"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";

type Video = {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  duration?: number;
  views?: number;
  sourceViews?: string | null;
  status: string; // active | hidden | dead | processing
  channelName?: string | null;
  channelLogo?: string | null;
  createdAt?: string;
};

import { formatViews } from "@/lib/format-views";

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (s === "hidden") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:bg-white/10 dark:text-neutral-300">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
        Hidden
      </span>
    );
  }
  if (s === "dead") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Dead Link
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {status || "Unknown"}
    </span>
  );
}

const PAGE_SIZE = 10;

export default function AdminAllVideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "hidden" | "dead"
  >("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/videos`, {
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    if (statusFilter !== "all") {
      list = list.filter(
        (v) => (v.status || "").toLowerCase() === statusFilter
      );
    }
    return list;
  }, [videos, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const toggleVisibility = async (video: Video) => {
    if (!token) return;
    const next = video.status === "hidden" ? "active" : "hidden";
    setBusyId(video.uuid);
    try {
      const res = await fetch(
        `${apiBase}/api/admin/videos/${video.uuid}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: next }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      setVideos((prev) =>
        prev.map((v) => (v.uuid === video.uuid ? { ...v, status: next } : v))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const refreshStream = async (uuid: string) => {
    if (!token) return;
    setBusyId(uuid);
    try {
      await fetch(`${apiBase}/api/admin/videos/${uuid}/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          All Videos
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          View, manage, and monitor all hosted videos on the platform.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos by title or channel..."
            className="w-full rounded-2xl border border-violet-300/70 bg-white py-3 pl-11 pr-4 text-sm outline-none ring-violet-500/20 focus:ring-2 dark:border-violet-500/30 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="appearance-none rounded-2xl border border-black/5 bg-white py-2.5 pl-9 pr-8 text-sm font-medium text-neutral-600 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="dead">Dead Link</option>
            </select>
          </div>

          <span className="hidden text-sm text-neutral-400 sm:inline">
            {filtered.length.toLocaleString()} videos found
          </span>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
      >
        {/* Header row — desktop only */}
        <div className="hidden grid-cols-12 gap-3 border-b border-black/[0.04] px-5 py-3 text-xs font-medium text-neutral-400 dark:border-white/10 lg:grid">
          <div className="col-span-4">Thumbnail / Title</div>
          <div className="col-span-1">Duration</div>
          <div className="col-span-1">Views</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Channel</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <p className="p-12 text-center text-sm text-neutral-500">
            No videos found
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.04] dark:divide-white/5">
            {pageItems.map((video) => {
              const busy = busyId === video.uuid;
              const isHidden = video.status === "hidden";

              return (
                <li
                  key={video.uuid}
                  className="grid grid-cols-1 items-center gap-3 px-4 py-3 transition hover:bg-violet-500/[0.03] dark:hover:bg-white/[0.03] sm:px-5 lg:grid-cols-12"
                >
                  {/* Thumb + title */}
                  <div className="flex items-center gap-3 lg:col-span-4">
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-zinc-800">
                      {video.thumbnail ? (
                        <Image
                          src={video.thumbnail}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : null}
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] text-white lg:hidden">
                        {formatDuration(video.duration || 0)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-neutral-900 dark:text-white">
                      {video.title}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="hidden text-sm text-neutral-500 lg:col-span-1 lg:block">
                    {formatDuration(video.duration || 0)}
                  </div>

                  {/* Views */}
                  <div className="hidden text-sm text-neutral-500 lg:col-span-1 lg:block">
                    {formatViews(video.sourceViews || video.views)}
                  </div>

                  {/* Status */}
                  <div className="lg:col-span-2">
                    <StatusPill status={video.status} />
                  </div>

                  {/* Channel */}
                  <div className="flex items-center gap-2 lg:col-span-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20">
                      {video.channelLogo ? (
                        <Image
                          src={video.channelLogo}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        (video.channelName || "?").charAt(0)
                      )}
                    </div>
                    <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">
                      {video.channelName || "Unknown"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 lg:col-span-2">
                    {/* Hide / Show */}
                    <button
                      type="button"
                      title={isHidden ? "Show video" : "Hide video"}
                      disabled={busy}
                      onClick={() => toggleVisibility(video)}
                      className="rounded-xl border border-black/5 p-2 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      {isHidden ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Refresh */}
                    <button
                      type="button"
                      title="Refresh stream"
                      disabled={busy}
                      onClick={() => refreshStream(video.uuid)}
                      className="rounded-xl border border-black/5 p-2 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <RefreshCw
                        className={cn("h-3.5 w-3.5", busy && "animate-spin")}
                      />
                    </button>

                    {/* Open watch page */}
                    <Link
                      href={`/watch/${video.slug}`}
                      target="_blank"
                      title="Open watch page"
                      className="rounded-xl border border-black/5 p-2 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination footer */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-black/[0.04] px-5 py-3 text-xs text-neutral-400 dark:border-white/10 sm:flex-row">
          <span>
            Showing{" "}
            {filtered.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(pageSafe * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length} results
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-black/5 p-2 disabled:opacity-40 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "h-8 min-w-[2rem] rounded-xl px-2 text-sm font-medium",
                    pageSafe === n
                      ? "bg-violet-600 text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  {n}
                </button>
              );
            })}

            {totalPages > 5 && (
              <span className="px-1 text-neutral-400">… {totalPages}</span>
            )}

            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-black/5 p-2 disabled:opacity-40 dark:border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
