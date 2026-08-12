"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, CheckCircle2, AlertCircle, Layers } from "lucide-react";

export default function ScrapePage() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"single" | "listing">("single");
  const [maxVideos, setMaxVideos] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setProgress([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("token");
      const endpoint = mode === "single" ? "/api/admin/scrape" : "/api/admin/scrape/listing";
      const body = mode === "single" ? { url } : { url, max_videos: maxVideos };

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Scrape failed");

      setResult(data);
      if (data.results) setProgress(data.results);
      setUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Scrape Videos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scrape a single video or bulk scrape category/channel listing pages
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        {/* Mode Selector */}
        <div className="flex gap-2 mb-6 p-1 bg-white/50 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition ${
              mode === "single" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Video
          </button>
          <button
            type="button"
            onClick={() => setMode("listing")}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition ${
              mode === "listing" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bulk Listing
          </button>
        </div>

        <form onSubmit={handleScrape} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mode === "single" ? "Single Video URL" : "Listing / Category Page URL"}
            </label>
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={mode === "single" ? "https://newxh.life/videos/...." : "https://newxh.life/channels/..."}
                className="pl-11"
                required
              />
            </div>
          </div>

          {mode === "listing" && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Max Videos to Scrape
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxVideos}
                onChange={(e) => setMaxVideos(parseInt(e.target.value) || 10)}
              />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "single" ? "Scraping Video..." : "Scraping Listing..."}
              </>
            ) : (
              mode === "single" ? "Start Single Scrape" : "Start Bulk Scrape"
            )}
          </Button>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-600 dark:text-green-400">Success</p>
              <p className="text-sm mt-1">{result.message}</p>
              {result.title && (
                <p className="text-sm text-muted-foreground mt-1">Title: {result.title}</p>
              )}
              {result.uuid && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">UUID: {result.uuid}</p>
              )}
            </div>
          </div>
        )}

        {/* Progress List */}
        {progress.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold">Scraped Items ({progress.length})</h3>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {progress.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-accent/40 text-xs flex justify-between items-center">
                  <span className="truncate max-w-[280px] font-medium">{item.title || item.url}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    item.status === 'scraped' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
