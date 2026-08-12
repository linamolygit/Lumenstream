"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import { formatDuration } from "@/lib/utils";

interface Video {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  duration: number;
  views: number;
  channelName: string | null;
  status: string;
}

export default function ManageStreamLinksPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [signedCopiedId, setSignedCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/admin/stream-links`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVideos(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  const copyLink = (uuid: string) => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";
    const link = `${workerUrl}/api/media?uuid=${uuid}`;
    navigator.clipboard.writeText(link);
    setCopiedId(uuid);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copySignedLink = async (uuid: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(
        `${apiUrl}/api/admin/videos/${uuid}/signed-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ expiresIn: 6 * 60 * 60 }), // 6 hours
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate signed link");

      navigator.clipboard.writeText(data.url);
      setSignedCopiedId(uuid);
      setTimeout(() => setSignedCopiedId(null), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to generate signed link");
    }
  };

  const filtered = videos.filter((v) =>
    v.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Manage Stream Links</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Copy permanent or 6-hour signed stream links for any video
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center text-muted-foreground">
          No videos found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((video, i) => (
            <motion.div
              key={video.uuid}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card overflow-hidden flex flex-col"
            >
              <div className="relative aspect-video">
                {video.thumbnail ? (
                  <Image src={video.thumbnail} alt={video.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs">
                  {formatDuration(video.duration)}
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-medium text-sm line-clamp-2 mb-1">{video.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {video.channelName || "Unknown"} • {(video.views || 0).toLocaleString()} views
                </p>

                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="glass"
                      className="flex-1 text-xs py-2"
                      onClick={() => copyLink(video.uuid)}
                    >
                      {copiedId === video.uuid ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>

                    <Button
                      variant="glass"
                      className="flex-1 text-xs py-2 border-violet-500/30"
                      onClick={() => copySignedLink(video.uuid)}
                    >
                      {signedCopiedId === video.uuid ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          Copied Signed
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                          Copy Signed
                        </>
                      )}
                    </Button>

                    <Button variant="ghost" className="px-3" onClick={() => window.open(`/watch/${video.slug}`, "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
