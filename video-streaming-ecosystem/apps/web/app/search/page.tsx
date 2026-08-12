"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VideoGrid } from "@/components/video-grid";
import { Search } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setVideos([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(
          `${apiUrl}/api/videos/search?q=${encodeURIComponent(q)}`
        );
        const json = await res.json();
        setVideos(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" />
          Search Results
        </h1>
        {q && (
          <p className="text-muted-foreground mt-1">
            Showing results for “{q}”
          </p>
        )}
      </div>

      <VideoGrid
        videos={videos}
        loading={loading}
        emptyMessage={q ? `No videos found for “${q}”` : "Type something to search"}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
