"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface VideoData {
  uuid: string;
  title: string;
  description?: string;
  thumbnail?: string;
  m3u8Links?: string[];
}

export default function WatchPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [video, setVideo] = useState<VideoData | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/api/videos/slug/${slug}`)
      .then((res) => res.json())
      .then(setVideo)
      .catch(console.error);
  }, [slug]);

  if (!video) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading...</main>;
  }

  const proxyUrl = `${process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787"}/api/media?uuid=${video.uuid}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold">{video.title}</h1>
        <div className="mt-6 rounded-xl bg-slate-900 p-4">
          <video
            controls
            className="w-full rounded-lg bg-black"
            poster={video.thumbnail}
            src={proxyUrl}
          />
        </div>
        <p className="mt-4 text-slate-300">{video.description}</p>
      </div>
    </main>
  );
}
