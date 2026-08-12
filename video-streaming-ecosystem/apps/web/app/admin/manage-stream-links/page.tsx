"use client";

import { useEffect, useState } from "react";

interface VideoCard {
  uuid: string;
  title: string;
  slug: string;
}

export default function ManageStreamLinksPage() {
  const [videos, setVideos] = useState<VideoCard[]>([]);
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/api/videos`)
      .then((res) => res.json())
      .then((data) => setVideos(data))
      .catch(console.error);
  }, []);

  const copyLink = async (uuid: string) => {
    const proxyUrl = `${process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787"}/api/media?uuid=${uuid}`;
    await navigator.clipboard.writeText(proxyUrl);
    setCopied(uuid);
    window.setTimeout(() => setCopied(""), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold">Manage Stream Links</h1>
        <p className="mt-2 text-slate-400">Copy permanent proxy links for WordPress and admin workflows.</p>
        <div className="mt-8 grid gap-4">
          {videos.map((video) => (
            <div key={video.uuid} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold">{video.title}</p>
                  <p className="text-slate-400">Slug: {video.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(video.uuid)}
                  className="rounded-xl bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400 transition"
                >
                  Copy Stream Link
                </button>
              </div>
              <p className="mt-3 text-slate-500 break-all">
                {process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787"}/api/media?uuid={video.uuid}
              </p>
              {copied === video.uuid && <p className="mt-2 text-emerald-400">Copied to clipboard!</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
