"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Eye } from "lucide-react";
import { useState, useRef } from "react";
import { formatDuration, cn } from "@/lib/utils";

interface VideoCardProps {
  video: {
    uuid: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    duration: number;
    views: number;
    sourceViews?: string | null;
    channelName?: string | null;
    sprite?: string | null;
    previewVideos?: string[] | null;
  };
  index?: number;
}

export function VideoCard({ video, index = 0 }: VideoCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const previewUrl = video.previewVideos?.[0] || null;

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && previewUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -6 }}
      className="group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/watch/${video.slug}`}>
        <div className="glass-card overflow-hidden transition-all duration-300 hover:shadow-glass-lg">
          {/* Thumbnail / Preview */}
          <div className="relative aspect-video overflow-hidden bg-muted">
            {/* Normal Thumbnail */}
            {video.thumbnail ? (
              <Image
                src={video.thumbnail}
                alt={video.title}
                fill
                className={cn(
                  "object-cover transition-opacity duration-300",
                  isHovering && previewUrl ? "opacity-0" : "opacity-100"
                )}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Preview Video on Hover */}
            {previewUrl && (
              <video
                ref={videoRef}
                src={previewUrl}
                muted
                loop
                playsInline
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  isHovering ? "opacity-100" : "opacity-0"
                )}
              />
            )}

            {/* Sprite fallback */}
            {!previewUrl && video.sprite && isHovering && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${video.sprite})`,
                }}
              />
            )}

            {/* Duration */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-sm z-10">
              {formatDuration(video.duration)}
            </div>

            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-10">
              <div className="opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 duration-300">
                <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Play className="h-6 w-6 text-white fill-white ml-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-medium text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              {video.channelName && (
                <span className="truncate max-w-[120px]">{video.channelName}</span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {video.sourceViews || video.views?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
