"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, CheckCircle2, AlertCircle, Film, Info } from "lucide-react";

export default function AddVideoPage() {
  const { token } = useAuth();
  const [url, setUrl] = useState("");
  const [maxVideos, setMaxVideos] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/user/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim(), max_videos: maxVideos }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Scrape failed");

      setResult(data);
      setUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scrapedCount = result?.results?.length || (result?.uuid ? 1 : 0);
  const successCount =
    result?.results?.filter((r: any) => r.status === "scraped").length ||
    (result?.uuid ? 1 : 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add Video</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste any video URL or homepage/listing URL. Our scraper will extract everything.
        </p>
      </div>

      {/* Supported Sites Info Note */}
      <div className="mb-6 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs leading-relaxed text-muted-foreground flex gap-3">
        <Info className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground mb-1">Supported Sites & Details</p>
          <p>• Supported: Most video platforms (xHamster and many others via yt-dlp).</p>
          <p>• Single video URLs and Homepage/Listing URLs are both fully supported.</p>
          <p>• Protected or DRM-restricted streams will extract title and thumbnails automatically.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <form onSubmit={handleScrape} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Website URL</label>
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/videos/... or homepage URL"
                className="pl-11"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Single video page ya listing/home page dono chalenge
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max videos (for listing pages)</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={maxVideos}
              onChange={(e) => setMaxVideos(Number(e.target.value))}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scraping... Please wait
              </>
            ) : (
              "Start Scrape"
            )}
          </Button>

          {loading && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              Scraping in progress. If this is the first request after a while, it can take up to 60–90 seconds while the server wakes up.
            </p>
          )}
        </form>

        {/* Success */}
        {result && (
          <div className="mt-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/20">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Scraping Complete
                </p>
                <p className="text-sm mt-1">
                  {successCount} video{successCount !== 1 ? "s" : ""} successfully scraped
                  {scrapedCount > successCount &&
                    ` (${scrapedCount - successCount} already existed)`}
                </p>
                {result.title && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Latest: {result.title}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Results list */}
      {result?.results && result.results.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Film className="h-4 w-4" />
            Scraped Videos
          </h2>
          <div className="space-y-3">
            {result.results.map((item: any, i: number) => (
              <div
                key={i}
                className="glass-card p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.title || item.url}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.status === "scraped" ? "✅ Scraped" : "ℹ️ Already exists"}
                  </p>
                </div>
                {item.uuid && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {item.uuid.slice(0, 8)}...
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
