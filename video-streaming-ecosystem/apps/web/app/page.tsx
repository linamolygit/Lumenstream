"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "@/components/video-card";
import { VideoCardSkeleton } from "@/components/video-card-skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { Sparkles, TrendingUp, Crown } from "lucide-react";

type Filter = "latest" | "trending" | "featured";

export default function HomePage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("latest");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/videos?limit=24&sort=${filter}`);
        const json = await res.json();
        setVideos(json.data || []);
      } catch (err) {
        console.error(err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  const chips: { key: Filter; label: string; icon: any }[] = [
    { key: "latest", label: "Latest", icon: Sparkles },
    { key: "trending", label: "Trending", icon: TrendingUp },
    { key: "featured", label: "Featured", icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
            Discover clean streams
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Curated videos, no clutter. Stream what you love in crystal-clear quality.
          </p>
        </div>

        {/* Filter chips */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {chips.map(({ key, label, icon: Icon }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "border border-black/5 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300 dark:hover:bg-zinc-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Grid / states */}
        {loading ? (
          <div>
            <p className="mb-4 text-sm font-medium text-neutral-500">Loading more for you</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="mx-auto max-w-md">
            <EmptyState />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.uuid} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
