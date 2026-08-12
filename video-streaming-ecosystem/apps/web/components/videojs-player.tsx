"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import type Player from "video.js/dist/types/player";

interface VideoJSPlayerProps {
  uuid: string;
  poster?: string | null;
  title?: string;
  quality?: string; // optional: "720", "1080", "auto"
  onError?: () => void;
}

export function VideoJSPlayer({
  uuid,
  poster,
  title,
  quality = "auto",
  onError,
}: VideoJSPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";
  const streamUrl =
    quality && quality !== "auto"
      ? `${workerUrl}/api/media?uuid=${uuid}&quality=${quality}`
      : `${workerUrl}/api/media?uuid=${uuid}`;

  useEffect(() => {
    if (!videoRef.current) return;

    // Prevent double init
    if (playerRef.current) {
      playerRef.current.src({
        src: streamUrl,
        type: "application/x-mpegURL",
      });
      return;
    }

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-theme-city");
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      autoplay: true,
      preload: "auto",
      fluid: true,
      responsive: true,
      poster: poster || undefined,
      sources: [
        {
          src: streamUrl,
          type: "application/x-mpegURL", // HLS
        },
      ],
      controlBar: {
        volumePanel: true,
        pictureInPictureToggle: true,
        fullscreenToggle: true,
      },
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
    });

    player.on("error", () => {
      console.error("Video.js error:", player.error());
      onError?.();
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamUrl, poster, onError]);

  // Quality change pe source update
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.src({
        src: streamUrl,
        type: "application/x-mpegURL",
      });
      playerRef.current.play()?.catch(() => {});
    }
  }, [streamUrl]);

  return (
    <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-card">
      <div data-vjs-player className="w-full h-full">
        <div ref={videoRef} className="w-full h-full" />
      </div>
    </div>
  );
}
