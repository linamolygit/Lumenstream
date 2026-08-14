"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  ListFilter,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Check,
} from "lucide-react";
import { YoutubePlayer } from "@/components/watch/youtube-player";
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

// YouTube Exact SVG Icons
function YtLikeIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("rotate-180", className)} viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="m11.31 2 .392.007c1.824.06 3.61.534 5.223 1.388l.343.189.27.154c.264.152.56.24.863.26l.13.004H20.5a1.5 1.5 0 011.5 1.5V11.5a1.5 1.5 0 01-1.5 1.5h-1.79l-.158.013a1 1 0 00-.723.512l-.064.145-2.987 8.535a1 1 0 01-1.109.656l-1.04-.174a4 4 0 01-3.251-4.783L10 15H5.938a3.664 3.664 0 01-3.576-2.868A3.682 3.682 0 013 9.15l-.02-.088A3.816 3.816 0 014 5.5v-.043l.008-.227a2.86 2.86 0 01.136-.664l.107-.28A3.754 3.754 0 017.705 2h3.605ZM7.705 4c-.755 0-1.425.483-1.663 1.2l-.032.126a.818.818 0 00-.01.131v.872l-.587.586a1.816 1.816 0 00-.524 1.465l.038.23.02.087.21.9-.55.744a1.686 1.686 0 00-.321 1.18l.029.177c.17.76.844 1.302 1.623 1.302H10a2.002 2.002 0 011.956 2.419l-.623 2.904-.034.208a2.002 2.002 0 001.454 2.139l.206.045.21.035 2.708-7.741A3.001 3.001 0 0118.71 11H20V6.002h-1.47c-.696 0-1.38-.183-1.985-.528l-.27-.155-.285-.157A10.002 10.002 0 0011.31 4H7.705Z" />
    </svg>
  );
}

function YtDislikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="m11.31 2 .392.007c1.824.06 3.61.534 5.223 1.388l.343.189.27.154c.264.152.56.24.863.26l.13.004H20.5a1.5 1.5 0 011.5 1.5V11.5a1.5 1.5 0 01-1.5 1.5h-1.79l-.158.013a1 1 0 00-.723.512l-.064.145-2.987 8.535a1 1 0 01-1.109.656l-1.04-.174a4 4 0 01-3.251-4.783L10 15H5.938a3.664 3.664 0 01-3.576-2.868A3.682 3.682 0 013 9.15l-.02-.088A3.816 3.816 0 014 5.5v-.043l.008-.227a2.86 2.86 0 01.136-.664l.107-.28A3.754 3.754 0 017.705 2h3.605ZM7.705 4c-.755 0-1.425.483-1.663 1.2l-.032.126a.818.818 0 00-.01.131v.872l-.587.586a1.816 1.816 0 00-.524 1.465l.038.23.02.087.21.9-.55.744a1.686 1.686 0 00-.321 1.18l.029.177c.17.76.844 1.302 1.623 1.302H10a2.002 2.002 0 011.956 2.419l-.623 2.904-.034.208a2.002 2.002 0 001.454 2.139l.206.045.21.035 2.708-7.741A3.001 3.001 0 0118.71 11H20V6.002h-1.47c-.696 0-1.38-.183-1.985-.528l-.27-.155-.285-.157A10.002 10.002 0 0011.31 4H7.705Z" />
    </svg>
  );
}

function YtShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M10 3.158V7.51c-5.428.223-8.27 3.75-8.875 11.199-.04.487-.07.975-.09 1.464l-.014.395c-.014.473.578.684.88.32.302-.368.61-.73.925-1.086l.244-.273c1.79-1.967 3-2.677 4.93-2.917a18.011 18.011 0 012-.112v4.346a1 1 0 001.646.763l9.805-8.297 1.55-1.31-1.55-1.31-9.805-8.297A1 1 0 0010 3.158Zm2 6.27v.002-4.116l7.904 6.688L12 18.689v-4.212l-2.023.024c-1.935.022-3.587.17-5.197 1.024a9 9 0 00-1.348.893c.355-1.947.916-3.39 1.63-4.425 1.062-1.541 2.607-2.385 5.02-2.485L12 9.428Z" />
    </svg>
  );
}

function YtSaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M19 2H5a2 2 0 00-2 2v16.887c0 1.266 1.382 2.048 2.469 1.399L12 18.366l6.531 3.919c1.087.652 2.469-.131 2.469-1.397V4a2 2 0 00-2-2ZM5 20.233V4h14v16.233l-6.485-3.89-.515-.309-.515.309L5 20.233Z" />
    </svg>
  );
}

function YtDownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M12 2a1 1 0 00-1 1v11.586l-4.293-4.293a1 1 0 10-1.414 1.414L12 18.414l6.707-6.707a1 1 0 10-1.414-1.414L13 14.586V3a1 1 0 00-1-1Zm7 18H5a1 1 0 000 2h14a1 1 0 000-2Z" />
    </svg>
  );
}

function YtMoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M6 10a2 2 0 100 4 2 2 0 000-4Zm6 0a2 2 0 100 4 2 2 0 000-4Zm6 0a2 2 0 100 4 2 2 0 000-4Z" />
    </svg>
  );
}

function formatViews(views?: number | string | null) {
  if (views == null) return "0 views";
  if (typeof views === "string")
    return views.toLowerCase().includes("view") ? views : `${views} views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K views`;
  return `${views} views`;
}

function timeAgo(date?: string) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${d >= 14 ? "s" : ""} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${d >= 60 ? "s" : ""} ago`;
  return `${Math.floor(d / 365)} year${d >= 730 ? "s" : ""} ago`;
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
  const [descOpen, setDescOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const workerBase = process.env.NEXT_PUBLIC_WORKER_URL || "";

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/api/videos/slug/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Video not found" : "Failed to load");
        const data = await res.json();
        setVideo(data);
        fetch(`${apiBase}/api/videos/${data.uuid}/view`, { method: "POST" }).catch(() => {});

        const rel = await fetch(`${apiBase}/api/videos?limit=16&sort=latest`);
        if (rel.ok) {
          const j = await rel.json();
          setRelated((j.data || []).filter((v: Video) => v.uuid !== data.uuid).slice(0, 12));
        }
      } catch (e: any) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, apiBase]);

  const streamUrl = useMemo(() => {
    if (!video?.uuid) return "";
    return `${workerBase}/api/media?uuid=${video.uuid}`;
  }, [video?.uuid, workerBase]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: video?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 pt-6 md:px-6 lg:px-8 dark:bg-[#0f0f0f]">
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_402px]">
          <div className="aspect-video animate-pulse rounded-xl bg-neutral-200 dark:bg-[#272727]" />
          <div className="hidden space-y-3 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-[94px] w-[168px] animate-pulse rounded-lg bg-neutral-200 dark:bg-[#272727]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-[#272727]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-[#272727]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground dark:bg-[#0f0f0f] dark:text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-3 text-lg font-semibold">{error || "Video not found"}</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm text-violet-600 dark:text-sky-400">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const inactive = !!(video.status && video.status !== "active");

  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-[#0f0f0f] dark:text-white">
      <div className="mx-auto max-w-[1800px] px-3 pb-16 pt-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_402px] lg:gap-6">
          {/* LEFT */}
          <div className="min-w-0">
            {/* Player */}
            <div className="relative overflow-hidden rounded-xl bg-black">
              {(inactive || streamError) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90">
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
                    <p className="mt-2 font-medium text-white">Stream unavailable</p>
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setPlayerKey((k) => k + 1);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
                    >
                      <RefreshCw className="h-4 w-4" /> Retry
                    </button>
                  </div>
                </div>
              )}
              {!inactive && streamUrl && (
                <YoutubePlayer
                  key={playerKey}
                  src={streamUrl}
                  poster={video.thumbnail}
                  title={video.title}
                  onError={() => setStreamError(true)}
                />
              )}
            </div>

            {/* Title */}
            <h1 className="mt-3 text-lg font-bold leading-snug text-neutral-900 sm:text-xl dark:text-white">
              {video.title}
            </h1>

            {/* Channel + actions */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-[#272727]">
                  {video.channelLogo ? (
                    <Image src={video.channelLogo} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-700 dark:text-white">
                      {(video.channelName || "U")[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    {video.channelName || "Unknown"}
                    <BadgeCheck className="h-4 w-4 text-neutral-500 dark:text-[#aaa]" />
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-[#aaa]">Channel</p>
                </div>
                <button className="ml-2 shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-white/90">
                  Subscribe
                </button>
              </div>

              {/* Exact YouTube Menu Renderer Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Segmented Like / Dislike */}
                <div className="flex overflow-hidden rounded-full bg-neutral-100 dark:bg-[#272727]">
                  <button
                    onClick={() => {
                      setLiked((v) => !v);
                      setDisliked(false);
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition hover:bg-neutral-200 dark:hover:bg-[#3f3f3f]",
                      liked ? "text-violet-600 dark:text-white" : "text-neutral-700 dark:text-neutral-200"
                    )}
                  >
                    <YtLikeIcon className={cn("h-5 w-5", liked && "fill-current")} />
                    <span>27k</span>
                  </button>
                  <div className="w-px self-stretch bg-neutral-300 dark:bg-[#3f3f3f]" />
                  <button
                    onClick={() => {
                      setDisliked((v) => !v);
                      setLiked(false);
                    }}
                    className={cn(
                      "inline-flex items-center px-3.5 py-2 text-sm font-medium transition hover:bg-neutral-200 dark:hover:bg-[#3f3f3f]",
                      disliked ? "text-violet-600 dark:text-white" : "text-neutral-700 dark:text-neutral-200"
                    )}
                  >
                    <YtDislikeIcon className={cn("h-5 w-5", disliked && "fill-current")} />
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={share}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-[#272727] dark:text-neutral-200 dark:hover:bg-[#3f3f3f]"
                >
                  {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <YtShareIcon className="h-5 w-5" />}
                  <span>{copied ? "Copied" : "Share"}</span>
                </button>

                {/* Save Button */}
                <button className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-[#272727] dark:text-neutral-200 dark:hover:bg-[#3f3f3f]">
                  <YtSaveIcon className="h-5 w-5" />
                  <span>Save</span>
                </button>

                {/* Download Button */}
                <button className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-[#272727] dark:text-neutral-200 dark:hover:bg-[#3f3f3f]">
                  <YtDownloadIcon className="h-5 w-5" />
                  <span>Download</span>
                </button>

                {/* More Button */}
                <button className="rounded-full bg-neutral-100 p-2 text-neutral-700 transition hover:bg-neutral-200 dark:bg-[#272727] dark:text-neutral-200 dark:hover:bg-[#3f3f3f]">
                  <YtMoreIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Description card */}
            <button
              type="button"
              onClick={() => setDescOpen((o) => !o)}
              className="mt-3 w-full rounded-xl bg-neutral-100 p-3.5 text-left text-sm transition hover:bg-neutral-200/80 dark:bg-[#272727] dark:hover:bg-[#3f3f3f]"
            >
              <p className="font-semibold text-neutral-900 dark:text-white">
                {formatViews(video.sourceViews || video.views)}
                {video.createdAt ? ` · ${timeAgo(video.createdAt)}` : ""}
              </p>
              <p
                className={cn(
                  "mt-1.5 whitespace-pre-wrap text-neutral-700 dark:text-[#f1f1f1]",
                  !descOpen && "line-clamp-2"
                )}
              >
                {video.description || "No description has been added to this video."}
              </p>
              <span className="mt-1 inline-block font-semibold text-neutral-900 dark:text-white">
                {descOpen ? "Show less" : "...more"}
              </span>
            </button>

            {/* Comments (UI shell) */}
            <div className="mt-6">
              <div className="mb-4 flex items-center gap-6">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">Comments</h2>
                <button className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-[#f1f1f1]">
                  <ListFilter className="h-5 w-5" /> Sort by
                </button>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200 dark:bg-[#3f3f3f]" />
                <input
                  placeholder="Add a comment..."
                  className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900 dark:border-[#3f3f3f] dark:placeholder:text-[#aaa] dark:focus:border-white"
                />
              </div>
              <p className="mt-6 text-center text-sm text-neutral-500 dark:text-[#aaa]">
                Comments will appear here when enabled.
              </p>
            </div>
          </div>

          {/* RIGHT: Related */}
          <aside className="min-w-0">
            <div className="space-y-3">
              {related.map((v) => (
                <Link
                  key={v.uuid}
                  href={`/watch/${v.slug}`}
                  prefetch={true}
                  className="group flex gap-2"
                >
                  <div className="relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-[#272727]">
                    {v.thumbnail && (
                      <Image
                        src={v.thumbnail}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="168px"
                        unoptimized
                      />
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[11px] font-medium text-white">
                      {formatDuration(v.duration || 0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-[#f1f1f1]">
                      {v.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-neutral-500 dark:text-[#aaa]">{v.channelName || "Unknown"}</p>
                    <p className="text-xs text-neutral-500 dark:text-[#aaa]">
                      {formatViews(v.sourceViews || v.views)}
                      {v.createdAt ? ` · ${timeAgo(v.createdAt)}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
              {related.length === 0 && (
                <p className="py-8 text-center text-sm text-neutral-500 dark:text-[#aaa]">No related videos</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
