"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VideoCard } from "@/components/video-card";
import { VideoCardSkeleton } from "@/components/video-card-skeleton";

interface Video {
  uuid: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  duration: number;
  views: number;
  sourceViews?: string | null;
  channelName?: string | null;
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/videos?limit=24`);
        if (!res.ok) throw new Error("Failed to load videos");
        const json = await res.json();
        setVideos(json.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Discover Premium Content
        </h1>
        <p className="mt-2 text-muted-foreground">
          Clean, fast, and ads-free streaming experience
        </p>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video, i) => (
            <VideoCard key={video.uuid} video={video} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
