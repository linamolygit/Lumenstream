"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DownloadSimple as Download, Play, Info } from "@phosphor-icons/react";

const DOWNLOADS_KEY = "lumenstream_downloads";

interface DownloadEntry {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string;
  duration?: number;
  channelName?: string;
  downloadedAt: string;
  url: string;
}

function formatDuration(sec?: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function formatRelativeDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOWNLOADS_KEY);
      if (raw) setDownloads(JSON.parse(raw));
    } catch {}
  }, []);

  const remove = (uuid: string) => {
    const updated = downloads.filter(d => d.uuid !== uuid);
    setDownloads(updated);
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    if (!confirm("Clear all download history?")) return;
    setDownloads([]);
    localStorage.removeItem(DOWNLOADS_KEY);
  };

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Download className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white">Downloads</h1>
          {downloads.length > 0 && (
            <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
              {downloads.length}
            </span>
          )}
        </div>
        {downloads.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-neutral-500 hover:text-red-400 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
        <p className="text-xs text-blue-300">
          Download history is stored locally in your browser. Files are downloaded directly from source servers.
        </p>
      </div>

      {downloads.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <Download className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-200">No downloads yet</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Use the download button on any video to start.
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

      {downloads.length > 0 && (
        <div className="space-y-2">
          {downloads.map(item => (
            <div
              key={item.uuid}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 hover:border-violet-500/20 hover:bg-white/[0.04] transition-all"
            >
              <Link href={`/watch/${item.slug}`} className="flex-shrink-0">
                <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-neutral-900">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-violet-900/30">
                      <Play className="h-5 w-5 text-violet-400/50" />
                    </div>
                  )}
                  {item.duration && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-medium text-white">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/watch/${item.slug}`}>
                  <p className="line-clamp-2 text-sm font-medium text-neutral-200 hover:text-white transition">
                    {item.title}
                  </p>
                </Link>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {item.channelName} · {formatRelativeDate(item.downloadedAt)}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <a
                  href={item.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20 transition active:scale-95"
                >
                  <Download className="h-3 w-3" /> Download again
                </a>
                <button
                  onClick={() => remove(item.uuid)}
                  className="rounded-lg p-1.5 text-neutral-600 opacity-0 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 transition active:scale-90"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
