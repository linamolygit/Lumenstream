"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import {
  Search, Eye, EyeOff, ExternalLink, RefreshCw
} from "lucide-react";

interface Video {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  duration: number;
  views: number;
  status: string;
  channelName: string | null;
  createdAt: string;
}

export default function AdminVideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/admin/stream-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVideos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${apiUrl}/api/admin/videos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const refreshVideo = async (uuid: string) => {
    setRefreshing(uuid);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(
        `${apiUrl}/api/admin/videos/${uuid}/refresh`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      alert(data.message || "Refreshed");
      load();
    } catch (err) {
      alert("Refresh failed");
    } finally {
      setRefreshing(null);
    }
  };

  const bulkRefresh = async () => {
    if (!confirm("Refresh dead/old streams? This may take time.")) return;
    setBulkLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(
        `${apiUrl}/api/admin/videos/refresh-bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ limit: 20, only_dead: true }),
        }
      );
      const data = await res.json();
      alert(data.message || "Bulk refresh completed");
      load();
    } catch (err) {
      alert("Bulk refresh failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const filtered = videos.filter((v) => {
    const matchSearch = v.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">All Videos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all scraped videos
          </p>
        </div>
        <Button
          onClick={bulkRefresh}
          disabled={bulkLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${bulkLoading ? "animate-spin" : ""}`} />
          {bulkLoading ? "Refreshing Streams..." : "Bulk Refresh Streams"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="dead">Dead</option>
          <option value="hidden">Hidden</option>
          <option value="processing">Processing</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-4 font-medium">Video</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium">Views</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Channel</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    No videos found
                  </td>
                </tr>
              ) : (
                filtered.map((video) => (
                  <tr key={video.uuid} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                          {video.thumbnail && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[220px]">{video.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">{video.uuid?.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{formatDuration(video.duration)}</td>
                    <td className="p-4">{(video.views || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          video.status === "active"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : video.status === "dead"
                            ? "bg-red-500/15 text-red-600 dark:text-red-400"
                            : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {video.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{video.channelName || "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => refreshVideo(video.uuid)}
                          disabled={refreshing === video.uuid}
                          className="p-2 rounded-lg hover:bg-accent transition"
                          title="Refresh Stream"
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshing === video.uuid ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          onClick={() => updateStatus(video.id, video.status === "active" ? "hidden" : "active")}
                          className="p-2 rounded-lg hover:bg-accent transition"
                          title={video.status === "active" ? "Hide" : "Show"}
                        >
                          {video.status === "active" ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={`/watch/${video.slug}`}
                          target="_blank"
                          className="p-2 rounded-lg hover:bg-accent transition"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
