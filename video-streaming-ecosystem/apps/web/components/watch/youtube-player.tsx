"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  SkipBack,
  SkipForward,
  PictureInPicture2,
  Cast,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
  onError?: () => void;
};

function fmt(t: number) {
  if (!Number.isFinite(t)) return "0:00";
  const s = Math.floor(t % 60);
  const m = Math.floor((t / 60) % 60);
  const h = Math.floor(t / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function YoutubePlayer({ src, poster, title, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const hlsRef = useRef<any>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVol, setShowVol] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fs, setFs] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [loading, setLoading] = useState(true);

  // HLS attach
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let destroyed = false;

    async function setup() {
      setLoading(true);
      if (src.includes(".m3u8")) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        } else {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, () => onError?.());
          } else {
            video.src = src;
          }
        }
      } else {
        video.src = src;
      }
      if (!destroyed) video.play().catch(() => {});
    }

    setup();
    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, onError]);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2800);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onMeta = () => setDuration(v.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
    };
    const onPause = () => setPlaying(false);
    const onWait = () => setLoading(true);
    const onCan = () => setLoading(false);
    const onProg = () => {
      try {
        if (v.buffered.length)
          setBuffered(v.buffered.end(v.buffered.length - 1) / (v.duration || 1));
      } catch {}
    };
    const onErr = () => onError?.();

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWait);
    v.addEventListener("canplay", onCan);
    v.addEventListener("progress", onProg);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("canplay", onCan);
      v.removeEventListener("progress", onProg);
      v.removeEventListener("error", onErr);
    };
  }, [onError]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
    scheduleHide();
  };

  const seekRatio = (clientX: number) => {
    const el = barRef.current;
    if (!el || !duration) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const onBarClick = (e: React.MouseEvent) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = seekRatio(e.clientX) * duration;
  };

  const onBarMove = (e: React.MouseEvent) => {
    const ratio = seekRatio(e.clientX);
    setHoverTime(ratio * duration);
    setHoverX(e.clientX - (barRef.current?.getBoundingClientRect().left || 0));
  };

  const setVol = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    setMuted(val === 0);
    v.muted = val === 0;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFs = async () => {
    const wrap = videoRef.current?.parentElement;
    if (!wrap) return;
    if (!document.fullscreenElement) {
      await wrap.requestFullscreen?.();
      setFs(true);
    } else {
      await document.exitFullscreen?.();
      setFs(false);
    }
  };

  const pip = async () => {
    const v = videoRef.current as any;
    if (v?.requestPictureInPicture) await v.requestPictureInPicture();
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onMouseMove={scheduleHide}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain cursor-pointer"
        poster={poster || undefined}
        playsInline
        onClick={togglePlay}
        title={title}
      />

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-10 transition-opacity",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Timeline */}
        <div
          ref={barRef}
          className="group/bar relative mb-1 h-1 cursor-pointer rounded-full bg-white/30 hover:h-1.5"
          onClick={onBarClick}
          onMouseMove={onBarMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/40"
            style={{ width: `${buffered * 100}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#f00]"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#f00] opacity-0 group-hover/bar:opacity-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />

          {/* Seek preview */}
          {hoverTime != null && (
            <div
              className="pointer-events-none absolute bottom-4 -translate-x-1/2"
              style={{ left: hoverX }}
            >
              <div className="overflow-hidden rounded-md border border-white/20 bg-black shadow-lg">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt="" className="h-16 w-28 object-cover opacity-90" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center bg-zinc-800 text-xs text-white">
                    {fmt(hoverTime)}
                  </div>
                )}
              </div>
              <p className="mt-1 text-center text-xs font-medium text-white">{fmt(hoverTime)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-white">
          <button type="button" onClick={togglePlay} className="rounded-full p-2 hover:bg-white/10">
            {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
          </button>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-white/10"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = Math.max(0, current - 10);
            }}
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-white/10"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = Math.min(duration, current + 10);
            }}
          >
            <SkipForward className="h-5 w-5" />
          </button>

          {/* Volume */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVol(true)}
            onMouseLeave={() => setShowVol(false)}
          >
            <button type="button" onClick={toggleMute} className="rounded-full p-2 hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all",
                showVol ? "w-20 opacity-100" : "w-0 opacity-0"
              )}
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVol(Number(e.target.value))}
                className="h-1 w-16 accent-white cursor-pointer"
              />
            </div>
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/90">
            {fmt(current)} / {fmt(duration)}
          </span>

          <div className="flex-1" />

          <button type="button" className="rounded-full p-2 hover:bg-white/10">
            <Subtitles className="h-5 w-5" />
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </button>
          <button type="button" onClick={pip} className="rounded-full p-2 hover:bg-white/10">
            <PictureInPicture2 className="h-5 w-5" />
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-white/10">
            <Cast className="h-5 w-5" />
          </button>
          <button type="button" onClick={toggleFs} className="rounded-full p-2 hover:bg-white/10">
            {fs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
