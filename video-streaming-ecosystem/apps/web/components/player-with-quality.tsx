"use client";

import { useState, useMemo } from "react";
import ReactPlayer from "react-player";
import { Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  uuid: string;
  m3u8Links?: string[];
  title?: string;
}

export function PlayerWithQuality({ uuid, m3u8Links = [], title }: Props) {
  const [quality, setQuality] = useState<string>("auto");
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState(false);

  // Extract available qualities from m3u8 links
  const qualities = useMemo(() => {
    const list: { label: string; value: string }[] = [{ label: "Auto", value: "auto" }];

    m3u8Links.forEach((link) => {
      const match = link.match(/(\d{3,4})p/);
      if (match) {
        const q = match[1];
        if (!list.find((item) => item.value === q)) {
          list.push({ label: `${q}p`, value: q });
        }
      }
    });

    // Sort high to low
    return list.sort((a, b) => {
      if (a.value === "auto") return -1;
      if (b.value === "auto") return 1;
      return Number(b.value) - Number(a.value);
    });
  }, [m3u8Links]);

  const streamUrl = useMemo(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";
    const base = `${workerUrl}/api/media?uuid=${uuid}`;
    if (quality && quality !== "auto") {
      return `${base}&quality=${quality}`;
    }
    return base;
  }, [uuid, quality]);

  return (
    <div className="relative aspect-video rounded-3xl overflow-hidden glass-card group">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <p className="text-white font-medium mb-1">Stream unavailable</p>
            <p className="text-white/60 text-sm">Link may have expired</p>
          </div>
        </div>
      ) : (
        <ReactPlayer
          key={streamUrl} // force re-render on quality change
          url={streamUrl}
          width="100%"
          height="100%"
          controls
          playing
          onError={() => setError(true)}
          config={{
            file: {
              attributes: {
                controlsList: "nodownload",
              },
            },
          }}
        />
      )}

      {/* Quality Button */}
      {qualities.length > 1 && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 transition"
          >
            <Settings className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 overflow-hidden shadow-xl">
              <div className="px-3 py-2 text-xs text-white/50 border-b border-white/10">
                Quality
              </div>
              {qualities.map((q) => (
                <button
                  key={q.value}
                  onClick={() => {
                    setQuality(q.value);
                    setShowMenu(false);
                    setError(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-sm text-white hover:bg-white/10 transition",
                    quality === q.value && "bg-white/10"
                  )}
                >
                  {q.label}
                  {quality === q.value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
