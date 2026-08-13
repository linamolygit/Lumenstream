"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Share2,
  Eye,
  Clock,
  BadgeCheck,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { VideoJSWithQuality } from "@/components/videojs-with-quality";
import { formatDuration, cn } from "@/lib/utils";

type Video = {
  uuid: string;
  title: string;
  slug: string;
  description?: string | null;
  duration: number;
  views: number;
  sourceViews?: string | null;
  channelName?: string | null;
  channelLogo?: string | null;
  thumbnail?: string | null;
  m3u8Links?: string[] | null;
  status: string;
  createdAt?: string;
};

function formatViews(views?: number | string | null) {
  if (views == null) return "0 views";
  if (typeof views === "string") {
    return views.toLowerCase().includes("view") ? views : `${views} views`;
  }
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K views`;
  return `${views} views`;
}

export default function WatchPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [watchLinkCopied, setWatchLinkCopied] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const workerBase = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setStreamError(false);
    try {
      const res = await fetch(`${apiBase}/api/videos/slug/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error(res.status === 404 ? "Video not found" : "Failed to load video");
      const data = await res.json();
      setVideo(data);

      // Record view asynchronously
      fetch(`${apiBase}/api/videos/${data.uuid}/view`, { method: "POST" }).catch(() => {});

      const relRes = await fetch(`${apiBase}/api/videos?limit=12&sort=latest`);
      if (relRes.ok) {
        const relJson = await relRes.json();
        setRelated((relJson.data || []).filter((v: Video) => v.uuid !== data.uuid).slice(0, 8));
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setVideo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const streamUrl = useMemo(() => {
    if (!video?.uuid) return "";
    return `${workerBase}/api/media?uuid=${video.uuid}`;
  }, [video?.uuid, workerBase]);

  const copyWatchLink = async () => {
    if (!video) return;
    const pageUrl = `${window.location.origin}/watch/${video.slug}`;
    await navigator.clipboard.writeText(pageUrl);
    setWatchLinkCopied(true);
    setTimeout(() => setWatchLinkCopied(false), 2000);
  };

  const copyStreamLink = async () => {
    if (!streamUrl) return;
    await navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePage = async () => {
    if (!video) return;
    const pageUrl = `${window.location.origin}/watch/${video.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url: pageUrl });
      } else {
        await navigator.clipboard.writeText(pageUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  };

  const retryStream = () => {
    setStreamError(false);
    setPlayerKey((k) => k + 1);
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="aspect-video animate-pulse rounded-[24px] bg-white dark:bg-zinc-900" />
              <div className="h-24 animate-pulse rounded-[24px] bg-white dark:bg-zinc-900" />
            </div>
            <div className="h-96 animate-pulse rounded-[24px] bg-white dark:bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  // ---------- Error / Not found ----------
  if (error || !video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4 dark:bg-black">
        <div className="w-full max-w-md rounded-[24px] border border-black/5 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-bold dark:text-white">{error || "Video not found"}</h1>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const inactive = video.status && video.status !== "active";

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
        {/* ~2/3 player + 1/3 related */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT: Player + info */}
          <div className="space-y-5 lg:col-span-2">
            {/* 16:9 player frame */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[24px] border border-black/5 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:border-white/10"
            >
              <div className="relative aspect-video bg-black">
                {/* Error overlay */}
                {(inactive || streamError) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 backdrop-blur-sm">
                    <div className="mx-4 max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
                      <p className="mt-3 text-base font-semibold text-white">Stream unavailable</p>
                      <p className="mt-1 text-sm text-white/60">
                        This link may have expired or failed to load.
                      </p>
                      <button
                        onClick={retryStream}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Real player */}
                {!inactive && (
                  <VideoJSWithQuality
                    key={playerKey}
                    uuid={video.uuid}
                    m3u8Links={video.m3u8Links || []}
                    poster={video.thumbnail}
                    title={video.title}
                    onError={() => setStreamError(true)}
                  />
                )}
              </div>
            </motion.div>

            {/* Title + meta + actions */}
            <div className="rounded-[24px] border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
              <h1 className="text-xl font-bold leading-snug text-neutral-900 dark:text-white sm:text-2xl">
                {video.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {formatViews(video.sourceViews || video.views)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(video.duration || 0)}
                </span>

                {video.channelName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    {video.channelLogo ? (
                      <Image
                        src={video.channelLogo}
                        alt=""
                        width={18}
                        height={18}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : null}
                    {video.channelName}
                    <BadgeCheck className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={copyWatchLink}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                    watchLinkCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-95 shadow-md shadow-violet-500/20"
                  )}
                >
                  {watchLinkCopied ? (
                    <>
                      <Check className="h-4 w-4" /> Watch Link Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy Watch Link
                    </>
                  )}
                </button>

                <button
                  onClick={copyStreamLink}
                  disabled={!streamUrl || !!inactive}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10",
                    copied && "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" /> Stream Link Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy Direct Stream Link
                    </>
                  )}
                </button>

                <button
                  onClick={sharePage}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
                >
                  {shareCopied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" /> Link Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" /> Share
                    </>
                  )}
                </button>
              </div>

              {video.description ? (
                <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {video.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* RIGHT: Related sidebar (stacked) */}
          <aside className="lg:col-span-1">
            <div className="rounded-[24px] border border-black/5 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80 sm:p-5">
              <h2 className="mb-4 text-base font-semibold text-neutral-900 dark:text-white">
                Related Videos
              </h2>

              {related.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">No related videos yet</p>
              ) : (
                <div className="space-y-3">
                  {related.map((v) => (
                    <Link
                      key={v.uuid}
                      href={`/watch/${v.slug}`}
                      className="group flex gap-3 rounded-2xl p-2 transition hover:bg-black/[0.03] dark:hover:bg-white/5"
                    >
                      <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-zinc-800">
                        {v.thumbnail ? (
                          <Image
                            src={v.thumbnail}
                            alt={v.title}
                            fill
                            className="object-cover transition group-hover:scale-105"
                            sizes="128px"
                            unoptimized
                          />
                        ) : null}
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
                          {formatDuration(v.duration || 0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300">
                          {v.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {v.channelName || "Unknown"}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatViews(v.sourceViews || v.views)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
