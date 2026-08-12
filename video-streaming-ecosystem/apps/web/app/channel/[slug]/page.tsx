"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoGrid } from "@/components/video-grid";

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(
          `${apiUrl}/api/videos/channel/${slug}`
        );
        const json = await res.json();
        setData(json);
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
      <div className="mb-8 flex items-center gap-4">
        {data?.data?.[0]?.channelLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.data[0].channelLogo}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {data?.channel || (slug || "").replace(/-/g, " ")}
          </h1>
          <p className="text-muted-foreground text-sm">Channel</p>
        </div>
      </div>

      <VideoGrid videos={data?.data || []} loading={loading} />
    </div>
  );
}
