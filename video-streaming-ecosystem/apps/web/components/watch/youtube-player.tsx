"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [autoPlayOn, setAutoPlayOn] = useState(true);
  const [ccOn, setCcOn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("Auto (1080p)");

  // HLS attach
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let destroyed = false;

    async function setup() {
      const v = videoRef.current;
      if (!v) return;
      setLoading(true);
      if (src.includes(".m3u8")) {
        if (v.canPlayType("application/vnd.apple.mpegurl")) {
          v.src = src;
        } else {
          try {
            const hlsName = "hls.js";
            const HlsModule = await import(/* webpackIgnore: true */ hlsName).catch(() => null);
            const Hls = HlsModule?.default || HlsModule;
            if (Hls && Hls.isSupported()) {
              const hls = new Hls({ enableWorker: true });
              hlsRef.current = hls;
              hls.loadSource(src);
              hls.attachMedia(v);
              hls.on(Hls.Events.ERROR, () => onError?.());
            } else {
              v.src = src;
            }
          } catch {
            v.src = src;
          }
        }
      } else {
        v.src = src;
      }
      if (!destroyed) v.play().catch(() => {});
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
    if (v?.requestPictureInPicture) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    }
  };

  // Keyboard Shortcuts (k/space, m, f, c, j/l/arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case "k":
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFs();
          break;
        case "c":
          e.preventDefault();
          setCcOn((prev) => !prev);
          break;
        case "j":
        case "arrowleft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          scheduleHide();
          break;
        case "l":
        case "arrowright":
          e.preventDefault();
          v.currentTime = Math.min(duration, v.currentTime + 10);
          scheduleHide();
          break;
        case "arrowup":
          e.preventDefault();
          setVol(Math.min(1, v.volume + 0.1));
          scheduleHide();
          break;
        case "arrowdown":
          e.preventDefault();
          setVol(Math.max(0, v.volume - 0.1));
          scheduleHide();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, scheduleHide]);

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

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black select-none"
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

      {/* Controls Container */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-12 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Progress Bar Container */}
        <div
          ref={barRef}
          className="group/bar relative mb-2 h-1 cursor-pointer rounded-full bg-white/20 transition-all hover:h-2"
          onClick={onBarClick}
          onMouseMove={onBarMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Buffer Bar */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/40"
            style={{ width: `${buffered * 100}%` }}
          />
          {/* Played Progress Bar */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-red-600"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber Handle */}
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-red-600 opacity-0 transition-opacity group-hover/bar:opacity-100 shadow-md"
            style={{ left: `calc(${progress}% - 7px)` }}
          />

          {/* Time Hover Preview */}
          {hoverTime != null && (
            <div
              className="pointer-events-none absolute bottom-5 -translate-x-1/2"
              style={{ left: hoverX }}
            >
              <div className="overflow-hidden rounded-lg border border-white/20 bg-black/90 shadow-2xl">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt="" className="h-16 w-28 object-cover opacity-90" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center bg-zinc-800 text-xs text-white">
                    {fmt(hoverTime)}
                  </div>
                )}
              </div>
              <p className="mt-1 text-center text-xs font-semibold text-white drop-shadow">{fmt(hoverTime)}</p>
            </div>
          )}
        </div>

        {/* Exact YouTube ytp-chrome-controls */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 transition hover:opacity-80 focus:outline-none"
              title={playing ? "Pause (k)" : "Play (k)"}
            >
              {playing ? (
                <svg fill="none" height="36" viewBox="0 0 36 36" width="36">
                  <path d="M 12 26 L 16 26 L 16 10 L 12 10 Z M 20 26 L 24 26 L 24 10 L 20 10 Z" fill="white"></path>
                </svg>
              ) : (
                <svg fill="none" height="36" viewBox="0 0 36 36" width="36">
                  <path d="M 17 8.6 L 10.89 4.99 C 9.39 4.11 7.5 5.19 7.5 6.93 C 7.5 6.93 7.5 6.93 7.5 6.93 L 7.5 29.06 C 7.5 30.8 9.39 31.88 10.89 31 C 10.89 31 10.89 31 10.89 31 L 17 27.4 C 17 27.4 17 27.4 17 27.4 C 17 27.4 17 27.4 17 27.4 L 17 8.6 C 17 8.6 17 8.6 17 8.6 C 17 8.6 17 8.6 17 8.6 Z M 17 8.6 L 17 8.6 C 17 8.6 17 8.6 17 8.6 C 17 8.6 17 8.6 17 8.6 V 27.4 C 17 27.4 17 27.4 17 27.4 C 17 27.4 17 27.4 17 27.4 L 33 18 C 33 18 33 18 33 18 C 33 18 33 18 33 18 V 18 L 17 8.6 C 17 8.6 17 8.6 17 8.6 C 17 8.6 17 8.6 17 8.6 Z" fill="white"></path>
                </svg>
              )}
            </button>

            {/* Next Button */}
            <button
              type="button"
              className="p-1.5 transition hover:opacity-80 focus:outline-none"
              title="Next (Shift+N)"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.min(duration, current + 10);
              }}
            >
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path d="M20 20C20.26 20 20.51 19.89 20.70 19.70C20.89 19.51 21 19.26 21 19V5C21 4.73 20.89 4.48 20.70 4.29C20.51 4.10 20.26 4 20 4C19.73 4 19.48 4.10 19.29 4.29C19.10 4.48 19 4.73 19 5V19C19 19.26 19.10 19.51 19.29 19.70C19.48 19.89 19.73 20 20 20ZM5.04 19.77L18 12L5.04 4.22C4.84 4.10 4.60 4.03 4.36 4.03C4.12 4.03 3.89 4.09 3.68 4.21C3.47 4.32 3.30 4.49 3.18 4.70C3.06 4.91 2.99 5.14 3 5.38V18.61C2.99 18.85 3.06 19.08 3.18 19.29C3.30 19.50 3.47 19.67 3.68 19.79C3.89 19.90 4.12 19.96 4.36 19.96C4.60 19.96 4.84 19.89 5.04 19.77Z" fill="white"></path>
              </svg>
            </button>

            {/* Volume Area */}
            <div
              className="flex items-center"
              onMouseEnter={() => setShowVol(true)}
              onMouseLeave={() => setShowVol(false)}
            >
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 transition hover:opacity-80 focus:outline-none"
                title={muted || volume === 0 ? "Unmute (m)" : "Mute (m)"}
              >
                {muted || volume === 0 ? (
                  <svg height="22" viewBox="0 0 24 24" width="22">
                    <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.49.91.1.4.52.62.9.48.78-.31 1.5-.73 2.15-1.24l1.43 1.43a.996.996 0 101.41-1.41L5.04 3.63a.996.996 0 00-1.41 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.37-.14-.78.04-.92.41-.14.37.04.78.41.92C17.3 6.06 19 8.82 19 12zm-3.02 0c0-.88-.36-1.68-.94-2.25l1.45-1.45A4.982 4.982 0 0117.5 12c0 1.25-.46 2.39-1.22 3.27l-1.43-1.43c.41-.47.67-1.1.67-1.84z" fill="white"></path>
                  </svg>
                ) : (
                  <svg height="22" viewBox="0 0 24 24" width="22">
                    <path d="M 11.60 2.08 L 11.48 2.14 L 3.91 6.68 C 3.02 7.21 2.28 7.97 1.77 8.87 C 1.26 9.77 1.00 10.79 1 11.83 V 12.16 L 1.01 12.56 C 1.07 13.52 1.37 14.46 1.87 15.29 C 2.38 16.12 3.08 16.81 3.91 17.31 L 11.48 21.85 C 11.63 21.94 11.80 21.99 11.98 21.99 C 12.16 22.00 12.33 21.95 12.49 21.87 C 12.64 21.78 12.77 21.65 12.86 21.50 C 12.95 21.35 13 21.17 13 21 V 3 C 12.99 2.83 12.95 2.67 12.87 2.52 C 12.80 2.37 12.68 2.25 12.54 2.16 C 12.41 2.07 12.25 2.01 12.08 2.00 C 11.92 1.98 11.75 2.01 11.60 2.08 Z" fill="#fff"></path>
                    <path d=" M 15.53 7.05 C 15.35 7.22 15.25 7.45 15.24 7.70 C 15.23 7.95 15.31 8.19 15.46 8.38 L 15.53 8.46 L 15.70 8.64 C 16.09 9.06 16.39 9.55 16.61 10.08 L 16.70 10.31 C 16.90 10.85 17 11.42 17 12 L 16.99 12.24 C 16.96 12.73 16.87 13.22 16.70 13.68 L 16.61 13.91 C 16.36 14.51 15.99 15.07 15.53 15.53 C 15.35 15.72 15.25 15.97 15.26 16.23 C 15.26 16.49 15.37 16.74 15.55 16.92 C 15.73 17.11 15.98 17.21 16.24 17.22 C 16.50 17.22 16.76 17.12 16.95 16.95 C 17.6 16.29 18.11 15.52 18.46 14.67 L 18.59 14.35 C 18.82 13.71 18.95 13.03 18.99 12.34 L 19 12 C 18.99 11.19 18.86 10.39 18.59 9.64 L 18.46 9.32 C 18.15 8.57 17.72 7.89 17.18 7.3 L 16.95 7.05 L 16.87 6.98 C 16.68 6.82 16.43 6.74 16.19 6.75 C 15.94 6.77 15.71 6.87 15.53 7.05" fill="#fff"></path>
                    <path d="M18.36 4.22C18.18 4.39 18.08 4.62 18.07 4.87C18.05 5.12 18.13 5.36 18.29 5.56L18.36 5.63L18.66 5.95C19.36 6.72 19.91 7.60 20.31 8.55L20.47 8.96C20.82 9.94 21 10.96 21 11.99L20.98 12.44C20.94 13.32 20.77 14.19 20.47 15.03L20.31 15.44C19.86 16.53 19.19 17.52 18.36 18.36C18.17 18.55 18.07 18.80 18.07 19.07C18.07 19.33 18.17 19.59 18.36 19.77C18.55 19.96 18.80 20.07 19.07 20.07C19.33 20.07 19.59 19.96 19.77 19.77C20.79 18.75 21.61 17.54 22.16 16.20L22.35 15.70C22.72 14.68 22.93 13.62 22.98 12.54L23 12C22.99 10.73 22.78 9.48 22.35 8.29L22.16 7.79C21.67 6.62 20.99 5.54 20.15 4.61L19.77 4.22L19.70 4.15C19.51 3.99 19.26 3.91 19.02 3.93C18.77 3.94 18.53 4.04 18.36 4.22 Z" fill="#fff"></path>
                  </svg>
                )}
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  showVol ? "w-16 opacity-100" : "w-0 opacity-0"
                )}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVol(Number(e.target.value))}
                  className="h-1 w-14 accent-white cursor-pointer"
                />
              </div>
            </div>

            {/* Time Display */}
            <span className="ml-2 text-xs font-medium text-[#eee]">
              {fmt(current)} / {fmt(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1">
            {/* Autoplay Toggle (YouTube exact style with Play/Pause inside knob) */}
            <button
              type="button"
              onClick={() => setAutoPlayOn((a) => !a)}
              className="p-1.5 transition hover:opacity-90 focus:outline-none"
              title={autoPlayOn ? "Auto-play is on" : "Auto-play is off"}
            >
              <div
                className={cn(
                  "relative flex h-5 w-10 items-center rounded-full transition-colors duration-200",
                  autoPlayOn ? "bg-white/40" : "bg-white/20"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white transition-all duration-200 shadow",
                    autoPlayOn ? "left-5.5" : "left-0.5"
                  )}
                >
                  {autoPlayOn ? (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-black ml-0.5">
                      <path d="M 3.5 2.5 L 9.5 6 L 3.5 9.5 Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-black">
                      <path d="M 3.5 3 L 5 3 L 5 9 L 3.5 9 Z M 7 3 L 8.5 3 L 8.5 9 L 7 9 Z" />
                    </svg>
                  )}
                </div>
              </div>
            </button>

            {/* Subtitles / CC */}
            <button
              type="button"
              onClick={() => setCcOn((c) => !c)}
              className={cn("p-1.5 transition hover:opacity-80 focus:outline-none", ccOn && "border-b-2 border-red-600")}
              title="Subtitles/closed captions (c)"
            >
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path d="M21.20 3.01L21 3H3L2.79 3.01C2.30 3.06 1.84 3.29 1.51 3.65C1.18 4.02 .99 4.50 1 5V19L1.01 19.20C1.05 19.66 1.26 20.08 1.58 20.41C1.91 20.73 2.33 20.94 2.79 20.99L3 21H21L21.20 20.98C21.66 20.94 22.08 20.73 22.41 20.41C22.73 20.08 22.94 19.66 22.99 19.20L23 19V5C23.00 4.50 22.81 4.02 22.48 3.65C22.15 3.29 21.69 3.06 21.20 3.01ZM3 19V5H21V19H3ZM8 11H6C5.73 11 5.48 11.10 5.29 11.29C5.10 11.48 5 11.73 5 12C5 12.26 5.10 12.51 5.29 12.70C5.48 12.89 5.73 13 6 13H8C8.26 13 8.51 12.89 8.70 12.70C8.89 12.51 9 12.26 9 12C9 11.73 8.89 11.48 8.70 11.29C8.51 11.10 8.26 11 8 11ZM18 11H12C11.73 11 11.48 11.10 11.29 11.29C11.10 11.48 11 11.73 11 12C11 12.26 11.10 12.51 11.29 12.70C11.48 12.89 11.73 13 12 13H18C18.26 13 18.51 12.89 18.70 12.70C18.89 12.51 19 12.26 19 12C19 11.73 18.89 11.48 18.70 15.29C18.51 15.10 18.26 15 18 15ZM12 15H6C5.73 15 5.48 15.10 5.29 15.29C5.10 15.48 5 15.73 5 16C5 16.26 5.10 16.51 5.29 16.70C5.48 16.89 5.73 17 6 17H12C12.26 17 12.51 16.89 12.70 16.70C12.89 16.51 13 16.26 13 16C13 15.73 12.89 15.48 12.70 15.29C12.51 15.10 12.26 15 12 15Z" fill="white"></path>
              </svg>
            </button>

            {/* Settings Button & Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((s) => !s)}
                className="p-1.5 transition hover:opacity-80 focus:outline-none"
                title="Settings"
              >
                <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                  <path d="M12.84 1H11.15C10.72 .99 10.30 1.14 9.95 1.40C9.60 1.66 9.35 2.02 9.23 2.44L9.19 2.61C9.11 3.00 8.96 3.38 8.73 3.71C8.51 4.04 8.22 4.33 7.89 4.55L7.75 4.64C7.37 4.85 6.96 4.98 6.53 5.02C6.11 5.06 5.68 5.01 5.27 4.87C4.86 4.73 4.42 4.73 4.00 4.86C3.59 5.00 3.23 5.26 2.99 5.62L2.89 5.77L2.05 7.23C1.82 7.63 1.73 8.10 1.81 8.55C1.88 9.01 2.12 9.43 2.47 9.73L2.58 9.84C3.15 10.39 3.50 11.15 3.50 12L3.49 12.16C3.47 12.56 3.37 12.95 3.19 13.31C3.01 13.67 2.77 13.99 2.47 14.26C2.12 14.56 1.88 14.98 1.81 15.43C1.73 15.89 1.82 16.36 2.05 16.76L2.89 18.22L2.99 18.37C3.24 18.73 3.59 18.99 4.01 19.13C4.42 19.26 4.86 19.26 5.27 19.12L5.42 19.07C5.81 18.96 6.21 18.93 6.61 18.98C7.01 19.03 7.40 19.15 7.75 19.36L7.89 19.44C8.22 19.66 8.51 19.95 8.73 20.28C8.96 20.61 9.11 20.99 9.19 21.38C9.28 21.84 9.52 22.24 9.88 22.54C10.24 22.83 10.69 23.00 11.15 23H12.84C13.30 23.00 13.75 22.83 14.11 22.54C14.47 22.24 14.71 21.84 14.80 21.38C14.89 20.96 15.06 20.56 15.31 20.21C15.55 19.86 15.88 19.57 16.25 19.36L16.39 19.28C16.75 19.10 17.14 18.99 17.54 18.96C17.94 18.94 18.34 18.99 18.72 19.12L18.89 19.17C19.31 19.27 19.75 19.24 20.15 19.07C20.55 18.90 20.88 18.60 21.10 18.23L21.95 16.76C22.18 16.36 22.26 15.89 22.19 15.43C22.11 14.98 21.88 14.56 21.53 14.26C21.23 13.99 20.98 13.67 20.80 13.31C20.63 12.95 20.52 12.56 20.50 12.16L20.50 12C20.50 11.57 20.59 11.14 20.77 10.75C20.94 10.36 21.20 10.01 21.53 9.73C21.88 9.43 22.11 9.01 22.19 8.55C22.26 8.10 22.18 7.63 21.95 7.23L21.10 5.76C20.88 5.39 20.55 5.09 20.15 4.92C19.76 4.75 19.31 4.72 18.89 4.82L18.72 4.87C18.34 5.00 17.94 5.05 17.54 5.03C17.14 5.00 16.75 4.89 16.4 4.71L16.25 4.63C15.88 4.42 15.56 4.13 15.31 3.78C15.06 3.43 14.89 3.03 14.80 2.61C14.71 2.15 14.47 1.74 14.11 1.45C13.75 1.16 13.30 .99 12.84 1ZM11.15 3H12.84C12.98 3.70 13.26 4.36 13.68 4.94C14.09 5.52 14.63 6.01 15.25 6.37C15.87 6.72 16.55 6.94 17.26 7.01C17.97 7.08 18.69 6.99 19.37 6.76L20.21 8.23C19.67 8.69 19.24 9.27 18.94 9.92C18.65 10.57 18.50 11.28 18.5 12C18.50 12.71 18.65 13.42 18.95 14.07C19.24 14.72 19.67 15.29 20.21 15.76L19.37 17.23C18.69 16.99 17.97 16.91 17.26 16.98C16.55 17.05 15.86 17.27 15.25 17.63C14.63 17.98 14.09 18.47 13.68 19.05C13.26 19.63 12.98 20.29 12.84 21H11.15C11.01 20.29 10.73 19.63 10.31 19.05C9.90 18.47 9.36 17.98 8.75 17.62C8.13 17.27 7.44 17.05 6.73 16.98C6.02 16.91 5.30 16.99 4.62 17.23L3.78 15.76C4.32 15.29 4.75 14.71 5.05 14.06C5.34 13.41 5.49 12.71 5.5 12C5.50 11.28 5.34 10.57 5.05 9.92C4.75 9.27 4.32 8.69 3.78 8.23L4.62 6.76C5.30 7.00 6.02 7.08 6.73 7.01C7.44 6.94 8.13 6.72 8.75 6.37C9.36 6.01 9.90 5.52 10.31 4.94C10.73 4.36 11.01 3.70 11.15 3ZM12.00 8C10.94 8 9.92 8.42 9.17 9.17C8.42 9.92 8.00 10.93 8.00 12C8.00 13.06 8.42 14.07 9.17 14.82C9.92 15.57 10.94 16 12.00 16C13.06 16 14.08 15.57 14.83 14.82C15.58 14.07 16.00 13.06 16.00 12C16.00 10.93 15.58 9.92 14.83 9.17C14.08 8.42 13.06 8 12.00 8ZM12.00 10H12L12.20 10.01C12.69 10.06 13.15 10.29 13.48 10.65C13.81 11.02 14.00 11.50 14 12L13.99 12.20C13.95 12.58 13.80 12.95 13.55 13.25C13.31 13.55 12.98 13.78 12.62 13.90C12.25 14.02 11.85 14.03 11.48 13.93C11.11 13.83 10.77 13.62 10.51 13.34C10.25 13.05 10.08 12.69 10.02 12.31C9.96 11.93 10.01 11.54 10.17 11.18C10.32 10.83 10.58 10.53 10.91 10.32C11.23 10.11 11.61 10.00 12 10" fill="white"></path>
                </svg>
              </button>

              {/* YouTube Settings Dropdown Popup */}
              {settingsOpen && (
                <div className="absolute bottom-10 right-0 z-40 w-52 overflow-hidden rounded-xl bg-black/90 p-1.5 text-xs text-white shadow-2xl backdrop-blur-md border border-white/10">
                  <div className="border-b border-white/10 pb-1.5 pt-1 px-2 font-bold text-neutral-300">
                    Playback Settings
                  </div>

                  {/* Playback Speed Menu */}
                  <div className="py-1">
                    <p className="px-2 py-1 font-semibold text-neutral-400">Speed</p>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.playbackRate = spd;
                          setSpeed(spd);
                          setSettingsOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-white/20",
                          speed === spd && "font-bold text-red-500"
                        )}
                      >
                        <span>{spd === 1 ? "Normal" : `${spd}x`}</span>
                        {speed === spd && <span>✓</span>}
                      </button>
                    ))}
                  </div>

                  {/* Quality Menu */}
                  <div className="border-t border-white/10 py-1">
                    <p className="px-2 py-1 font-semibold text-neutral-400">Quality</p>
                    {["Auto (1080p)", "720p", "480p", "360p"].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setQuality(q);
                          setSettingsOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-white/20",
                          quality === q && "font-bold text-red-500"
                        )}
                      >
                        <span>{q}</span>
                        {quality === q && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cinema Mode */}
            <button
              type="button"
              className="p-1.5 transition hover:opacity-80 focus:outline-none"
              title="Cinema mode (t)"
            >
              <svg height="22" viewBox="0 0 24 24" width="22">
                <path d="M21.20 3.01L21 3H3L2.79 3.01C2.30 3.06 1.84 3.29 1.51 3.65C1.18 4.02 .99 4.50 1 5V19L1.01 19.20C1.05 19.66 1.26 20.08 1.58 20.41C1.91 20.73 2.33 20.94 2.79 20.99L3 21H21L21.20 20.98C21.66 20.94 22.08 20.73 22.41 20.41C22.73 20.08 22.94 19.66 22.99 19.20L23 19V5C23.00 4.50 22.81 4.02 22.48 3.65C22.15 3.29 21.69 3.06 21.20 3.01ZM3 15V5H21V15H3ZM7.87 6.72L7.79 6.79L4.58 10L7.79 13.20C7.88 13.30 7.99 13.37 8.11 13.43C8.23 13.48 8.37 13.51 8.50 13.51C8.63 13.51 8.76 13.48 8.89 13.43C9.01 13.38 9.12 13.31 9.21 13.21C9.31 13.12 9.38 13.01 9.43 12.89C9.48 12.76 9.51 12.63 9.51 12.50C9.51 12.37 9.48 12.23 9.43 12.11C9.37 11.99 9.30 11.88 9.20 11.79L7.41 10L9.20 8.20L9.27 8.13C9.42 7.93 9.50 7.69 9.48 7.45C9.47 7.20 9.36 6.97 9.19 6.80C9.02 6.63 8.79 6.52 8.54 6.51C8.30 6.49 8.06 6.57 7.87 6.72ZM14.79 6.79C14.60 6.98 14.50 7.23 14.50 7.5C14.50 7.76 14.60 8.01 14.79 8.20L16.58 10L14.79 11.79L14.72 11.86C14.57 12.06 14.49 12.30 14.50 12.54C14.51 12.79 14.62 13.02 14.79 13.20C14.97 13.37 15.20 13.48 15.45 13.49C15.69 13.50 15.93 13.42 16.13 13.27L16.20 13.20L19.41 10L16.20 6.79C16.01 6.60 15.76 6.50 15.5 6.50C15.23 6.50 14.98 6.60 14.79 6.79ZM3 19V17H21V19H3Z" fill="white"></path>
              </svg>
            </button>

            {/* Picture-in-Picture */}
            <button
              type="button"
              onClick={pip}
              className="p-1.5 transition hover:opacity-80 focus:outline-none"
              title="Picture-in-picture"
            >
              <svg fill="currentColor" height="22" viewBox="0 0 24 24" width="22">
                <path d="M1 6a2 2 0 012-2h18a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V6Zm2 0v12h18V6H3Zm16 6h-6v4h6v-4Z"></path>
              </svg>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFs}
              className="p-1.5 transition hover:opacity-80 focus:outline-none"
              title={fs ? "Exit full screen (f)" : "Full screen (f)"}
            >
              <svg height="22" viewBox="0 0 24 24" width="22">
                <path d="M10 3H3V10C3 10.26 3.10 10.51 3.29 10.70C3.48 10.89 3.73 11 4 11C4.26 11 4.51 10.89 4.70 10.70C4.89 10.51 5 10.26 5 10V6.41L9.29 10.70L9.36 10.77C9.56 10.92 9.80 11.00 10.04 10.99C10.29 10.98 10.52 10.87 10.70 10.70C10.87 10.52 10.98 10.29 10.99 10.04C11.00 9.80 10.92 9.56 10.77 9.36L10.70 9.29L6.41 5H10C10.26 5 10.51 4.89 10.70 4.70C10.89 4.51 11 4.26 11 4C11 3.73 10.89 3.48 10.70 3.29C10.51 3.10 10.26 3 10 3ZM20 13C19.73 13 19.48 13.10 19.29 13.29C19.10 13.48 19 13.73 19 14V17.58L14.70 13.29L14.63 13.22C14.43 13.07 14.19 12.99 13.95 13.00C13.70 13.01 13.47 13.12 13.29 13.29C13.12 13.47 13.01 13.70 13.00 13.95C12.99 14.19 13.07 14.43 13.22 14.63L13.29 14.70L17.58 19H14C13.73 19 13.48 19.10 13.29 19.29C13.10 19.48 13 19.73 13 20C13 20.26 13.10 20.51 13.29 20.70C13.48 20.89 13.73 21 14 21H21V14C21 13.73 20.89 13.48 20.70 13.29C20.51 13.10 20.26 13 20 13Z" fill="white"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
