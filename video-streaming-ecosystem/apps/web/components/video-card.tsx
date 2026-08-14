"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MoreVertical, BadgeCheck } from "lucide-react";
import { formatDuration } from "@/lib/utils";

function formatViews(views?: number | string | null) {
  if (views == null) return "0 views";
  if (typeof views === "string")
    return views.toLowerCase().includes("view") ? views : `${views} views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${Math.round(views / 1_000)}K views`;
  return `${views} views`;
}

function timeAgo(date?: string) {
  if (!date) return "";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

export function VideoCard({ video }: { video: any }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hover, setHover] = useState(false);

  const previewSrc: string | undefined =
    (Array.isArray(video.previewVideos) && video.previewVideos[0]) ||
    (Array.isArray(video.preview_videos) && video.preview_videos[0]) ||
    undefined;

  const onEnter = () => {
    setHover(true);
    const el = videoRef.current;
    if (el && previewSrc) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  };

  const onLeave = () => {
    setHover(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  return (
    <Link href={`/watch/${video.slug}`} prefetch={true} className="group block">
      <article className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-zinc-900">
        <div
          className="relative aspect-video overflow-hidden bg-neutral-100 dark:bg-zinc-800"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          {/* Static thumb */}
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt={video.title || ""}
              fill
              unoptimized
              className={`object-cover transition duration-300 ${
                hover && previewSrc
                  ? "opacity-0"
                  : "opacity-100 group-hover:scale-[1.03]"
              }`}
              sizes="(max-width:768px) 100vw, 25vw"
            />
          ) : null}

          {/* Hover preview MP4 */}
          {previewSrc && (
            <video
              ref={videoRef}
              src={previewSrc}
              muted
              loop
              playsInline
              preload="none"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                hover ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Optional sprite fallback strip (if no mp4 preview) */}
          {!previewSrc && video.sprite && hover && (
            <div
              className="absolute inset-0 bg-cover bg-left"
              style={{ backgroundImage: `url(${video.sprite})` }}
            />
          )}

          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(video.duration || 0)}
          </span>
        </div>

        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 dark:text-white">
              {video.title}
            </h3>
            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="truncate">
              {video.channelName || video.channel || "Unknown"}
            </span>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          </div>

          <p className="mt-1 text-xs text-neutral-400">
            {formatViews(video.sourceViews || video.views)}
            {video.createdAt ? ` • ${timeAgo(video.createdAt)}` : ""}
          </p>
        </div>
      </article>
    </Link>
  );
}
