"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useUserApi } from "@/lib/use-user-api";
import Link from "next/link";
import {
  ClockCounterClockwise as Clock,
  BookmarkSimple as Bookmark,
  TrendUp as TrendingUp,
  Sparkle as Sparkles,
  Play,
  CaretRight as ChevronRight,
  ArrowsClockwise as RefreshCw,
} from "@phosphor-icons/react";

interface VideoCard {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  sourceViews?: string;
  channelName?: string;
  channelLogo?: string;
  progressSec?: number;
  durationSec?: number;
  watchedAt?: string;
}

import { formatViews } from "@/lib/format-views";

function formatDuration(sec?: number): string {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function VideoCardSmall({ v, progress }: { v: VideoCard; progress?: boolean }) {
  const pct =
    progress && v.progressSec && v.durationSec
      ? Math.min((v.progressSec / v.durationSec) * 100, 100)
      : 0;

  return (
    <Link
      href={`/watch/${v.slug}`}
      className="group relative flex-shrink-0 w-44 sm:w-48 overflow-hidden rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-violet-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
    >
      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-neutral-900">
        {v.thumbnail ? (
          <img
            src={v.thumbnail}
            alt={v.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-indigo-900/40">
            <Play className="h-8 w-8 text-violet-400/50" />
          </div>
        )}
        {v.duration ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {formatDuration(v.durationSec || v.duration)}
          </span>
        ) : null}
        {/* Continue watching overlay */}
        {progress && pct > 0 && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/90 shadow-lg">
              <Play className="h-4 w-4 fill-white text-white" strokeWidth={0} />
            </div>
          </div>
        )}
      </div>
      {/* Progress bar */}
      {progress && pct > 0 && (
        <div className="h-0.5 w-full bg-neutral-800">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-medium text-neutral-200 leading-tight">
          {v.title}
        </p>
        <p className="mt-1 truncate text-[10px] text-neutral-500">
          {v.channelName || "Unknown"}
        </p>
      </div>
    </Link>
  );
}

function VideoGrid({ videos }: { videos: VideoCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {videos.map((v) => (
        <Link
          key={v.uuid}
          href={`/watch/${v.slug}`}
          className="group overflow-hidden rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-violet-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
        >
          <div className="relative aspect-video overflow-hidden bg-neutral-900">
            {v.thumbnail ? (
              <img
                src={v.thumbnail}
                alt={v.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-indigo-900/40">
                <Play className="h-8 w-8 text-violet-400/40" />
              </div>
            )}
            {v.duration ? (
              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {formatDuration(v.duration)}
              </span>
            ) : null}
          </div>
          <div className="p-2.5">
            <p className="line-clamp-2 text-xs font-semibold text-neutral-200 leading-snug">
              {v.title}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {v.channelLogo ? (
                <img src={v.channelLogo} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full bg-violet-500/40" />
              )}
              <p className="truncate text-[10px] text-neutral-500">{v.channelName || "Unknown"}</p>
              <span className="ml-auto text-[10px] text-neutral-600 flex-shrink-0">
                {formatViews(v.sourceViews || v.views, "views")}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  href,
}: {
  icon: React.ElementType;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-400" strokeWidth={2} />
        <h2 className="text-sm font-bold text-neutral-100">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const { get } = useUserApi();

  const [data, setData] = useState<{
    continueWatching: VideoCard[];
    recentlyWatched: VideoCard[];
    savedVideos: VideoCard[];
    trending: VideoCard[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await get("/api/user/dashboard");
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-8">
        {/* Skeleton */}
        <div className="h-20 w-2/3 animate-pulse rounded-2xl bg-white/[0.04]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-28 w-44 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-neutral-500">{error}</p>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-full p-4 md:p-6 space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-transparent border border-violet-500/20 px-6 py-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
        <p className="text-xs font-medium text-violet-400 mb-1">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-white">
          {firstName} <span className="wave">👋</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Welcome back to LumenStream. Here&apos;s what&apos;s waiting for you.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {data?.continueWatching && data.continueWatching.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300">
              <Play className="h-3 w-3" /> {data.continueWatching.length} video{data.continueWatching.length !== 1 ? "s" : ""} in progress
            </span>
          )}
          {data?.savedVideos && data.savedVideos.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300">
              <Bookmark className="h-3 w-3" /> {data.savedVideos.length} saved
            </span>
          )}
        </div>
      </div>

      {/* Continue Watching */}
      {data?.continueWatching && data.continueWatching.length > 0 && (
        <section>
          <SectionHeader icon={Play} title="Continue Watching" href="/user/history" />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {data.continueWatching.map((v) => (
              <VideoCardSmall key={v.uuid} v={v} progress />
            ))}
          </div>
        </section>
      )}

      {/* Recently Watched */}
      {data?.recentlyWatched && data.recentlyWatched.length > 0 && (
        <section>
          <SectionHeader icon={Clock} title="Recently Watched" href="/user/history" />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {data.recentlyWatched.map((v) => (
              <VideoCardSmall key={v.uuid} v={v} />
            ))}
          </div>
        </section>
      )}

      {/* Saved Videos */}
      {data?.savedVideos && data.savedVideos.length > 0 && (
        <section>
          <SectionHeader icon={Bookmark} title="Saved Videos" href="/user/saved" />
          <VideoGrid videos={data.savedVideos.slice(0, 4)} />
        </section>
      )}

      {/* Trending */}
      {data?.trending && data.trending.length > 0 && (
        <section>
          <SectionHeader icon={TrendingUp} title="Trending Now" href="/trending" />
          <VideoGrid videos={data.trending.slice(0, 8)} />
        </section>
      )}

      {/* Empty state */}
      {!data?.continueWatching?.length &&
        !data?.recentlyWatched?.length &&
        !data?.savedVideos?.length && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <Sparkles className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-200">
                Your dashboard is fresh!
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Start watching videos to see your activity here.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95"
            >
              Browse Videos
            </Link>
          </div>
        )}
    </div>
  );
}
