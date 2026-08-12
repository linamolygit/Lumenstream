"use client";

import { useState, useMemo } from "react";
import { VideoJSPlayer } from "./videojs-player";
import { Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  uuid: string;
  m3u8Links?: string[];
  poster?: string | null;
  title?: string;
  onError?: () => void;
}

export function VideoJSWithQuality({ uuid, m3u8Links = [], poster, title, onError }: Props) {
  const [quality, setQuality] = useState("auto");
  const [showMenu, setShowMenu] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const qualities = useMemo(() => {
    const list = [{ label: "Auto", value: "auto" }];

    m3u8Links.forEach((link) => {
      const match = link.match(/(\d{3,4})p/i);
      if (match) {
        const q = match[1];
        if (!list.find((item) => item.value === q)) {
          list.push({ label: `${q}p`, value: q });
        }
      }
    });

    return list.sort((a, b) => {
      if (a.value === "auto") return -1;
      if (b.value === "auto") return 1;
      return Number(b.value) - Number(a.value);
    });
  }, [m3u8Links]);

  return (
    <div className="relative">
      {!hasError && (
        <VideoJSPlayer
          uuid={uuid}
          poster={poster}
          title={title}
          quality={quality}
          onError={handleError}
        />
      )}

      {/* Quality Menu — top-right of player */}
      {qualities.length > 1 && !hasError && (
        <div className="absolute top-4 right-4 z-30">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/70 transition"
          >
            <Settings className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/20 overflow-hidden shadow-xl">
              <div className="px-3 py-2 text-xs text-white/50 border-b border-white/10">
                Quality
              </div>
              {qualities.map((q) => (
                <button
                  key={q.value}
                  onClick={() => {
                    setQuality(q.value);
                    setShowMenu(false);
                    setHasError(false);
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
