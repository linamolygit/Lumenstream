"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MagnifyingGlass as SearchIcon,
  VideoCamera as Film,
  PencilSimple as EditIcon,
  Trash as DeleteIcon,
  LinkSimple as Link2Icon,
  ArrowsClockwise as RefreshCwIcon,
  Eye as EyeIcon,
  DotsThreeVertical as MoreVertical,
  CheckCircle,
  XCircle,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  Funnel as FilterIcon,
  Plus as PlusIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";

type Video = {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  duration?: number;
  views: number;
  sourceViews?: string | null;
  channelName?: string | null;
  channelLogo?: string | null;
  status: string;
  createdAt?: string;
};

export default function AllVideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);

  const ITEMS_PER_PAGE = 30;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/videos`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setVideos(data || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [apiBase, token]);

  const filtered = useMemo(() => {
    return videos
      .filter((v) => {
        if (statusFilter !== "all" && v.status.toLowerCase() !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          v.uuid.toLowerCase().includes(q) ||
          v.slug?.toLowerCase().includes(q) ||
          v.channelName?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortBy === "views") return (b.views || 0) - (a.views || 0);
        return 0;
      });
  }, [videos, search, statusFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/videos/${deleteTarget.uuid}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.uuid !== deleteTarget.uuid));
      }
    } catch {}
    setDeleteTarget(null);
  };

  const handleToggleStatus = async (v: Video) => {
    const newStatus = v.status === "active" ? "hidden" : "active";
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/videos/${v.uuid}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setVideos((prev) => prev.map((item) => (item.uuid === v.uuid ? { ...item, status: newStatus } : item)));
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">All Videos ({filtered.length})</h1>
          <p className="mt-1 text-xs text-neutral-400">Content management portal (30 videos per page).</p>
        </div>
        <Link
          href="/admin/scrape"
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-600/25"
        >
          <PlusIcon className="h-4 w-4" /> Scrape New Videos
        </Link>
      </div>

      {/* Search & Filters Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/[0.08] bg-black/40 p-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search videos by title, UUID, channel, or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-violet-500/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="processing">Processing</option>
            <option value="dead">Dead</option>
            <option value="hidden">Hidden</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-violet-500/50"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="views">Sort: Most Viewed</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      )}

      {/* Videos 30 Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paginated.map((v) => (
            <div
              key={v.uuid}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 transition hover:border-white/20 hover:bg-white/[0.02]"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
                {v.thumbnail ? (
                  <Image src={v.thumbnail} alt="" fill className="object-cover transition duration-300 group-hover:scale-105" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-neutral-600">No Image</div>
                )}
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {formatDuration(v.duration || 0)}
                </span>
                <span
                  className={cn(
                    "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white uppercase",
                    v.status === "active" ? "bg-emerald-600/90" : "bg-red-600/90"
                  )}
                >
                  {v.status}
                </span>
              </div>

              {/* Card Meta */}
              <div className="flex flex-1 flex-col p-3.5 justify-between">
                <div>
                  <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-violet-400">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 truncate text-[11px] font-medium text-neutral-400">{v.channelName || "Unknown Channel"}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {formatViews(v.views, "views")}
                    {v.sourceViews ? ` (${formatViews(v.sourceViews)} src)` : ""}
                  </p>
                </div>

                {/* Card Quick Actions */}
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/watch/${v.slug || v.uuid}`}
                      target="_blank"
                      className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white hover:text-black"
                      title="Watch Video"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(v)}
                      className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white hover:text-black"
                      title={v.status === "active" ? "Hide Video" : "Activate Video"}
                    >
                      {v.status === "active" ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    </button>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(v)}
                    className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-500/20"
                    title="Delete Video"
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-6">
          <p className="text-xs text-neutral-400">
            Showing Page <span className="font-bold text-white">{currentPage}</span> of{" "}
            <span className="font-bold text-white">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-black disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="px-2 text-xs font-bold text-violet-400">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-black disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl">
            <h3 className="text-base font-bold text-white">Permanently Delete Video?</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400 line-clamp-2">{deleteTarget.title}</p>
            <p className="mt-1 text-[10px] font-mono text-red-400">UUID: {deleteTarget.uuid}</p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition active:scale-95 shadow-lg shadow-red-600/25"
              >
                Delete Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
