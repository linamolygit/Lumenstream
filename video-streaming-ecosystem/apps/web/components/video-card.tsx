"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MoreVertical, BadgeCheck, Bookmark, Share2, Copy, Check, Loader2 } from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { ShareModal } from "@/components/share-modal";
import { formatViews } from "@/lib/format-views";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [hover, setHover] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const previewSrc: string | undefined =
    (Array.isArray(video.previewVideos) && video.previewVideos[0]) ||
    (Array.isArray(video.preview_videos) && video.preview_videos[0]) ||
    undefined;

  // Mobile Scroll Intersection Observer (triggers preview when card is in center of viewport)
  useEffect(() => {
    if (!containerRef.current || !previewSrc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && window.innerWidth < 768) {
            setHover(true);
            setLoadingPreview(true);
            const el = videoRef.current;
            if (el) {
              el.currentTime = 0;
              el.play().catch(() => setLoadingPreview(false));
            }
          } else if (!entry.isIntersecting && window.innerWidth < 768) {
            setHover(false);
            setLoadingPreview(false);
            const el = videoRef.current;
            if (el) {
              el.pause();
              el.currentTime = 0;
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [previewSrc]);

  const onEnter = () => {
    setHover(true);
    const el = videoRef.current;
    if (el && previewSrc) {
      setLoadingPreview(true);
      el.currentTime = 0;
      el.play().catch(() => setLoadingPreview(false));
    }
  };

  const onLeave = () => {
    setHover(false);
    setLoadingPreview(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/watch/${video.slug}` : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    setMenuOpen(false);
  };

  const watchUrl = `/watch/${video.slug}`;

  return (
    <>
      <div ref={containerRef} className="group relative block">
        <article className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-zinc-900">
          <Link
            href={watchUrl}
            prefetch={true}
            className="relative block aspect-video overflow-hidden bg-neutral-100 dark:bg-zinc-800"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          >
            {/* Thumbnail */}
            {video.thumbnail ? (
              <Image
                src={video.thumbnail}
                alt={video.title || ""}
                fill
                unoptimized
                className={`object-cover transition duration-300 ${
                  hover && previewSrc && !loadingPreview
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
                preload="metadata"
                onPlaying={() => setLoadingPreview(false)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                  hover && !loadingPreview ? "opacity-100" : "opacity-0"
                }`}
              />
            )}

            {/* Preview Loading Spinner */}
            {hover && loadingPreview && previewSrc && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <Loader2 className="h-7 w-7 animate-spin text-white drop-shadow" />
              </div>
            )}

            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {formatDuration(video.duration || 0)}
            </span>
          </Link>

          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={watchUrl} prefetch={true} className="flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                  {video.title}
                </h3>
              </Link>

              {/* 3-Dot Menu Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((o) => !o);
                  }}
                  className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white transition"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-7 z-30 w-44 rounded-xl border border-black/5 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSaved((s) => !s);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                    >
                      <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-amber-500 text-amber-500")} />
                      {saved ? "Saved" : "Save Video"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShareOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share Video
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-white/10"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied Link" : "Copy Link"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Channel Logo & Name */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-zinc-800">
                {video.channelLogo ? (
                  <Image src={video.channelLogo} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-700 dark:text-white">
                    {(video.channelName || video.channel || "U")[0]}
                  </div>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="truncate font-medium">
                  {video.channelName || video.channel || "Unknown"}
                </span>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-violet-500" />
              </div>
            </div>

            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {formatViews(video.sourceViews || video.views, "views")}
              {video.createdAt ? ` • ${timeAgo(video.createdAt)}` : ""}
            </p>
          </div>
        </article>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={video.title}
        url={typeof window !== "undefined" ? `${window.location.origin}/watch/${video.slug}` : ""}
      />
    </>
  );
}
