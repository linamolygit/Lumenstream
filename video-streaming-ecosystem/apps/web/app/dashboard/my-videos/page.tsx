"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { VideoGrid } from "@/components/video-grid";
import Link from "next/link";

export default function MyVideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/user/my-videos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Videos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Videos you have scraped
          </p>
        </div>
        <Link
          href="/dashboard/add-video"
          className="glass px-4 py-2 rounded-2xl text-sm font-medium hover:bg-white/10 transition"
        >
          + Add Video
        </Link>
      </div>

      <VideoGrid
        videos={videos}
        loading={loading}
        emptyMessage="You haven't scraped any videos yet. Go to Add Video to start."
      />
    </div>
  );
}
