"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  MoreHorizontal,
  Copy,
  Check,
  ExternalLink,
  Eye,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";

type MyVideo = {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  duration?: number;
  views?: number;
  sourceViews?: string | null;
  channelName?: string | null;
  channelLogo?: string | null;
  createdAt?: string;
  status?: string;
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

function timeAgo(date?: string) {
  if (!date) return "";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}

function VideoSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.04] bg-white dark:border-white/10 dark:bg-zinc-900">
      <div className="aspect-video animate-pulse bg-neutral-100 dark:bg-zinc-800" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export default function MyVideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<MyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const workerBase = process.env.NEXT_PUBLIC_WORKER_URL;

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/my-videos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // Close menu on outside click
  useEffect(() => {
    const close = () => setOpenMenu(null);
    if (openMenu) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const copyStream = async (uuid: string) => {
    if (!workerBase) return;
    const link = `${workerBase}/api/media?uuid=${uuid}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(uuid);
    setOpenMenu(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            My Videos
          </h1>
          <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
            Manage, preview and share all your uploaded and scraped videos.
          </p>
        </div>

        <Link
          href="/dashboard/add-video"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add Video
        </Link>
      </div>

      {/* Grid / states */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-[20px] border border-black/[0.04] bg-white px-6 py-20 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-violet-300 bg-violet-50 text-violet-500 dark:border-violet-500/30 dark:bg-violet-500/10">
            <Play className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            No videos yet
          </h3>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Add your first video to get started.
          </p>
          <Link
            href="/dashboard/add-video"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Video
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video, index) => (
            <motion.article
              key={video.uuid}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group relative overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
            >
              {/* Thumbnail */}
              <Link href={`/watch/${video.slug}`} className="block">
                <div className="relative aspect-video overflow-hidden bg-neutral-100 dark:bg-zinc-800">
                  {video.thumbnail ? (
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      unoptimized
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width:768px) 100vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-400">
                      <Play className="h-8 w-8" />
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(video.duration || 0)}
                  </span>
                </div>
              </Link>

              {/* Meta */}
              <div className="p-3">
                <Link href={`/watch/${video.slug}`}>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 transition group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300">
                    {video.title}
                  </h3>
                </Link>

                <div className="mt-2.5 flex items-center gap-2">
                  {/* Channel avatar / initial */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    {video.channelLogo ? (
                      <Image
                        src={video.channelLogo}
                        alt=""
                        width={24}
                        height={24}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (video.channelName || "U").charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      {video.channelName || "Unknown"}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {formatViews(video.sourceViews || video.views)}
                      {video.createdAt ? ` · ${timeAgo(video.createdAt)}` : ""}
                    </p>
                  </div>

                  {/* ··· menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === video.uuid ? null : video.uuid);
                      }}
                      className="rounded-xl p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {openMenu === video.uuid && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-black/5 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-900"
                      >
                        <button
                          type="button"
                          onClick={() => copyStream(video.uuid)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5"
                        >
                          {copiedId === video.uuid ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copy Stream Link
                            </>
                          )}
                        </button>
                        <Link
                          href={`/watch/${video.slug}`}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5"
                          onClick={() => setOpenMenu(null)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Watch Page
                        </Link>
                        <Link
                          href={`/watch/${video.slug}`}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
