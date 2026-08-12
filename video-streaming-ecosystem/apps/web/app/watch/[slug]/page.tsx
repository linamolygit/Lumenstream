"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Check, Share2, Eye, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { VideoCard } from "@/components/video-card";
import { VideoJSWithQuality } from "@/components/videojs-with-quality";

export default function WatchPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [video, setVideo] = useState<any>(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/videos/slug/${slug}`);
        if (!res.ok) throw new Error("Video not found");
        const data = await res.json();
        setVideo(data);

        // related
        const rel = await fetch(`${apiUrl}/api/videos?limit=8`);
        const relJson = await rel.json();
        setRelated(relJson.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";
  const streamUrl = video
    ? `${workerUrl}/api/media?uuid=${video.uuid}`
    : "";

  const copyStreamLink = () => {
    if (streamUrl) {
      navigator.clipboard.writeText(streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="aspect-video rounded-3xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Video not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player Section */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <VideoJSWithQuality
              uuid={video.uuid}
              m3u8Links={video.m3u8Links || []}
              poster={video.thumbnail}
              title={video.title}
            />
          </motion.div>

          {/* Title + Actions */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold leading-tight">{video.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {video.sourceViews || video.views?.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(video.duration)}
              </span>
              {video.channelName && (
                <span className="px-3 py-1 rounded-full bg-accent text-xs">
                  {video.channelName}
                </span>
              )}
            </div>

            {/* Copy Stream Link */}
            <div className="flex gap-3">
              <button
                onClick={copyStreamLink}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl glass hover:bg-white/20 dark:hover:bg-white/10 transition font-medium text-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Stream Link
                  </>
                )}
              </button>

              <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl glass hover:bg-white/20 dark:hover:bg-white/10 transition font-medium text-sm">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Related */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Related Videos</h2>
          <div className="space-y-4">
            {related
              .filter((v: any) => v.uuid !== video.uuid)
              .slice(0, 6)
              .map((v: any, i: number) => (
                <VideoCard key={v.uuid} video={v} index={i} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
