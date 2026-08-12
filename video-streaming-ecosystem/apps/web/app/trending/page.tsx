"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "@/components/video-card";
import { VideoCardSkeleton } from "@/components/video-card-skeleton";
import { EmptyState } from "@/components/empty-state";
import { TrendingUp } from "lucide-react";

export default function TrendingPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/videos?limit=24&sort=trending`
        );
        const json = await res.json();
        setVideos(json.data || []);
      } catch {
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Trending
            </h1>
            <p className="text-sm text-neutral-500">Most viewed streams right now</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="mx-auto max-w-md">
            <EmptyState />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((v) => (
              <VideoCard key={v.uuid} video={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
