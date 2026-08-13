"use client";

import { VideoCard } from "./video-card";
import { VideoCardSkeleton } from "./video-card-skeleton";

interface Props {
  videos: any[];
  loading?: boolean;
  emptyMessage?: string;
}

export function VideoGrid({ videos, loading, emptyMessage = "No videos found" }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!videos || !videos.length) {
    return (
      <div className="glass-card p-16 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video, i) => (
        <VideoCard key={video.uuid} video={video} />
      ))}
    </div>
  );
}
