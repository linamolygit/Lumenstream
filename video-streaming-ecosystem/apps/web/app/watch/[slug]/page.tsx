"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Download,
  MoreHorizontal,
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
      <div className="min-h-screen bg-[#0f0f0f] px-4 pt-6 md:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_402px]">
          <div className="aspect-video animate-pulse rounded-xl bg-[#272727]" />
          <div className="hidden space-y-3 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-[94px] w-[168px] animate-pulse rounded-lg bg-[#272727]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-[#272727]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[#272727]" />
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
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-3 text-lg font-semibold">{error || "Video not found"}</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm text-sky-400">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const inactive = !!(video.status && video.status !== "active");

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
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
                    <p className="mt-2 font-medium">Stream unavailable</p>
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setPlayerKey((k) => k + 1);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
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
            <h1 className="mt-3 text-lg font-bold leading-snug sm:text-xl">{video.title}</h1>

            {/* Channel + actions */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#272727]">
                  {video.channelLogo ? (
                    <Image src={video.channelLogo} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                      {(video.channelName || "U")[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    {video.channelName || "Unknown"}
                    <BadgeCheck className="h-4 w-4 text-[#aaa]" />
                  </p>
                  <p className="text-xs text-[#aaa]">Channel</p>
                </div>
                <button className="ml-2 shrink-0 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-black hover:bg-white/90">
                  Subscribe
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Like / Dislike segmented */}
                <div className="flex overflow-hidden rounded-full bg-[#272727]">
                  <button
                    onClick={() => {
                      setLiked((v) => !v);
                      setDisliked(false);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium hover:bg-[#3f3f3f]",
                      liked && "text-white"
                    )}
                  >
                    <ThumbsUp className={cn("h-5 w-5", liked && "fill-white")} />
                    Like
                  </button>
                  <div className="w-px self-stretch bg-[#3f3f3f]" />
                  <button
                    onClick={() => {
                      setDisliked((v) => !v);
                      setLiked(false);
                    }}
                    className="px-3.5 py-2 hover:bg-[#3f3f3f]"
                  >
                    <ThumbsDown className={cn("h-5 w-5", disliked && "fill-white")} />
                  </button>
                </div>

                <button
                  onClick={share}
                  className="inline-flex items-center gap-2 rounded-full bg-[#272727] px-3.5 py-2 text-sm font-medium hover:bg-[#3f3f3f]"
                >
                  {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                  {copied ? "Copied" : "Share"}
                </button>
                <button className="inline-flex items-center gap-2 rounded-full bg-[#272727] px-3.5 py-2 text-sm font-medium hover:bg-[#3f3f3f]">
                  <Bookmark className="h-5 w-5" /> Save
                </button>
                <button className="inline-flex items-center gap-2 rounded-full bg-[#272727] px-3.5 py-2 text-sm font-medium hover:bg-[#3f3f3f]">
                  <Download className="h-5 w-5" /> Download
                </button>
                <button className="rounded-full bg-[#272727] p-2 hover:bg-[#3f3f3f]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Description card */}
            <button
              type="button"
              onClick={() => setDescOpen((o) => !o)}
              className="mt-3 w-full rounded-xl bg-[#272727] p-3 text-left text-sm hover:bg-[#3f3f3f]"
            >
              <p className="font-semibold">
                {formatViews(video.sourceViews || video.views)}
                {video.createdAt ? ` · ${timeAgo(video.createdAt)}` : ""}
              </p>
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap text-[#f1f1f1]",
                  !descOpen && "line-clamp-2"
                )}
              >
                {video.description || "No description has been added to this video."}
              </p>
              <span className="mt-1 inline-block font-semibold">{descOpen ? "Show less" : "...more"}</span>
            </button>

            {/* Comments (UI shell — wire API later) */}
            <div className="mt-6">
              <div className="mb-4 flex items-center gap-6">
                <h2 className="text-base font-bold">Comments</h2>
                <button className="inline-flex items-center gap-2 text-sm text-[#f1f1f1]">
                  <ListFilter className="h-5 w-5" /> Sort by
                </button>
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-[#3f3f3f]" />
                <input
                  placeholder="Add a comment..."
                  className="w-full border-b border-[#3f3f3f] bg-transparent py-2 text-sm outline-none placeholder:text-[#aaa] focus:border-white"
                />
              </div>
              <p className="mt-6 text-center text-sm text-[#aaa]">
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
                  className="group flex gap-2"
                >
                  <div className="relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg bg-[#272727]">
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
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[11px] font-medium">
                      {formatDuration(v.duration || 0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-[#f1f1f1]">
                      {v.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#aaa]">{v.channelName || "Unknown"}</p>
                    <p className="text-xs text-[#aaa]">
                      {formatViews(v.sourceViews || v.views)}
                      {v.createdAt ? ` · ${timeAgo(v.createdAt)}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
              {related.length === 0 && (
                <p className="py-8 text-center text-sm text-[#aaa]">No related videos</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
