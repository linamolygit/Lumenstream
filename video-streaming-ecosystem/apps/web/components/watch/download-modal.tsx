"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Sparkles,
  Zap,
  ShieldCheck,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    uuid: string;
    title: string;
    slug?: string;
    thumbnail?: string | null;
    duration?: number;
    channelName?: string | null;
  };
  streamUrl: string;
}

interface QualityOption {
  id: string;
  label: string;
  res: string;
  bitrate: string;
  badge?: string;
  estMultiplier: number;
}

const QUALITIES: QualityOption[] = [
  { id: "1080p", label: "1080p Full HD", res: "1920x1080", bitrate: "High Bitrate (60fps)", badge: "Best Quality", estMultiplier: 1.0 },
  { id: "720p", label: "720p HD", res: "1280x720", bitrate: "Standard HD", badge: "Recommended", estMultiplier: 0.6 },
  { id: "480p", label: "480p SD", res: "854x480", bitrate: "Medium Quality", badge: "Data Saver", estMultiplier: 0.35 },
  { id: "360p", label: "360p Low", res: "640x360", bitrate: "Fast Download", badge: "Mobile", estMultiplier: 0.2 },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DownloadModal({ isOpen, onClose, video, streamUrl }: DownloadModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<string>("1080p");
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("Ready");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastLoadedRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on modal close if not downloading
      if (!downloading) {
        setProgress(0);
        setDownloadedBytes(0);
        setTotalBytes(0);
        setSpeed(0);
        setCompleted(false);
        setError(null);
      }
    }
  }, [isOpen, downloading]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (!streamUrl || downloading) return;

    setDownloading(true);
    setProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setSpeed(0);
    setCompleted(false);
    setError(null);
    setStatusText("Connecting to secure stream proxy...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = Date.now();
    lastTimeRef.current = startTime;
    lastLoadedRef.current = 0;

    try {
      const response = await fetch(streamUrl, {
        signal: controller.signal,
        headers: {
          "Accept": "*/*",
        },
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      setTotalBytes(total);
      setStatusText("Downloading chunks from Cloudflare CDN...");

      if (!response.body) {
        throw new Error("ReadableStream not supported on this response");
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;
        setDownloadedBytes(receivedBytes);

        const now = Date.now();
        const timeDiff = (now - lastTimeRef.current) / 1000;
        if (timeDiff >= 0.3) {
          const bytesDiff = receivedBytes - lastLoadedRef.current;
          const currentSpeed = bytesDiff / timeDiff;
          setSpeed(currentSpeed);
          lastTimeRef.current = now;
          lastLoadedRef.current = receivedBytes;
        }

        if (total > 0) {
          const percent = Math.min(99, Math.round((receivedBytes / total) * 100));
          setProgress(percent);
        } else {
          // If Content-Length unknown, estimate progress
          setProgress((prev) => Math.min(95, prev + 1));
        }
      }

      setStatusText("Assembling final MP4 package...");
      setProgress(100);

      // Create Blob from downloaded chunks
      const blob = new Blob(chunks, { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);

      // Save to localStorage history
      try {
        const existing = JSON.parse(localStorage.getItem("lumenstream_downloads") || "[]");
        const updated = [
          {
            uuid: video.uuid,
            title: video.title,
            slug: video.slug,
            thumbnail: video.thumbnail,
            duration: video.duration,
            channelName: video.channelName,
            downloadedAt: new Date().toISOString(),
            size: formatBytes(receivedBytes),
            quality: selectedQuality,
          },
          ...existing.filter((item: any) => item.uuid !== video.uuid),
        ];
        localStorage.setItem("lumenstream_downloads", JSON.stringify(updated.slice(0, 50)));
      } catch {}

      // Trigger browser file download
      const cleanTitle = video.title.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "video";
      const filename = `${cleanTitle}_${selectedQuality}.mp4`;

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      setCompleted(true);
      setStatusText("Download complete! File saved to your device.");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatusText("Download cancelled by user.");
      } else {
        console.error("Download error:", err);
        setError(err.message || "Failed to download stream");
        setStatusText("Download failed. Please try again.");
      }
    } finally {
      setDownloading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setDownloading(false);
    setStatusText("Download cancelled");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Ambient Background */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Download Video</h2>
              <p className="text-xs text-neutral-400">High-speed SaaS Proxy Streaming</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Preview Card */}
        <div className="mt-4 flex gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="relative h-18 w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-900 shadow-md">
            {video.thumbnail ? (
              <Image src={video.thumbnail} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-neutral-500">
                No Preview
              </div>
            )}
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-bold text-white">
              {formatDuration(video.duration)}
            </span>
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-white">
              {video.title}
            </h3>
            <p className="mt-1 text-[11px] text-neutral-400 truncate">
              {video.channelName || "LumenStream Official"}
            </p>
          </div>
        </div>

        {/* Quality Selection (Enabled when not downloading) */}
        {!downloading && !completed && (
          <div className="mt-5 space-y-2.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
              <span>Select Download Quality</span>
              <span className="text-[11px] font-normal text-violet-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> DRM-Clean MP4
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUALITIES.map((q) => {
                const isSelected = selectedQuality === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuality(q.id)}
                    className={`relative flex flex-col rounded-2xl border p-3 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-neutral-200"}`}>
                        {q.label}
                      </span>
                      {q.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                            isSelected
                              ? "bg-violet-500 text-white"
                              : "bg-white/10 text-neutral-400"
                          }`}
                        >
                          {q.badge}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-[11px] text-neutral-400">{q.bitrate}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Bar & Live Speed Stats */}
        {(downloading || completed || error) && (
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-white flex items-center gap-1.5">
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : error ? (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                ) : (
                  <Zap className="h-4 w-4 text-violet-400 animate-pulse" />
                )}
                {statusText}
              </span>
              <span className="font-mono text-sm font-bold text-violet-400">{progress}%</span>
            </div>

            {/* Glowing Gradient Progress Track */}
            <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-200 shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Metrics: Downloaded MB / Total MB + Speed */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>
                {formatBytes(downloadedBytes)} {totalBytes > 0 ? `/ ${formatBytes(totalBytes)}` : ""}
              </span>
              {downloading && speed > 0 && (
                <span className="text-emerald-400 font-semibold">{formatBytes(speed)}/s</span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
          {downloading ? (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition active:scale-95"
            >
              <Pause className="h-3.5 w-3.5" /> Cancel Download
            </button>
          ) : completed ? (
            <>
              <button
                onClick={handleStartDownload}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Download Again
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 transition active:scale-95"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStartDownload}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 transition active:scale-95"
              >
                <Download className="h-4 w-4" /> Start Download ({selectedQuality})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
