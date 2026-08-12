"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoGrid } from "@/components/video-grid";

export default function TagPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        // Reuse category endpoint for now
        const res = await fetch(
          `${apiUrl}/api/videos/category/${slug}`
        );
        const json = await res.json();
        setVideos(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">#{slug}</h1>
        <p className="text-muted-foreground mt-1">Tag</p>
      </div>
      <VideoGrid videos={videos} loading={loading} />
    </div>
  );
}
