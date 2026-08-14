"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  VideoCamera as Film,
  CheckCircle,
  Eye,
  LinkSimple as Link2,
  UsersThree as Users,
  DotsThree as MoreHorizontal,
  Clock,
  XCircle,
  MagnifyingGlassPlus as ScrapeIcon,
  ChatText as CommentsIcon,
  Plus as PlusIcon,
  Lightning as QuickIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";

type RecentVideo = {
  uuid: string;
  title: string;
  slug?: string;
  thumbnail?: string | null;
  duration?: number;
  views?: number;
  status: string;
  channelName?: string | null;
  channelLogo?: string | null;
  createdAt?: string;
};

type Stats = {
  totalVideos: number;
  activeVideos: number;
  deadVideos: number;
  totalViews: number;
  totalUsers: number;
  recentVideos: RecentVideo[];
};

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
      <XCircle className="h-3.5 w-3.5" />
      Dead
    </span>
  );
}

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/admin/stats`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {}
      setLoading(false);
    })();
  }, [apiBase, token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Videos",
      value: stats?.totalVideos?.toLocaleString() ?? "0",
      sub: `${stats?.activeVideos ?? 0} active`,
      icon: Film,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers?.toLocaleString() ?? "0",
      sub: "Registered members",
      icon: Users,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Total Views",
      value: formatViews(stats?.totalViews ?? 0),
      sub: "Lumenstream views",
      icon: Eye,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Active Streams",
      value: (stats?.activeVideos ?? 0).toLocaleString(),
      sub: `${stats?.deadVideos ?? 0} dead streams`,
      icon: Link2,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Overview Dashboard</h1>
          <p className="mt-1 text-xs text-neutral-400">Real-time stats and controls for Lumenstream SaaS.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/scrape"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-600/25"
          >
            <ScrapeIcon className="h-4 w-4" />
            Scrape Videos
          </Link>
          <Link
            href="/admin/videos"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white hover:text-black active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            Manage Videos
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("rounded-2xl border p-5 transition-all duration-200 hover:border-white/20", c.bg)}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-neutral-400">{c.title}</p>
                <div className={cn("rounded-xl p-2.5 bg-black/40", c.color)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-white">{c.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-neutral-400">{c.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
          <QuickIcon className="h-5 w-5 text-amber-400" />
          Quick Admin Actions
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <Link
            href="/admin/scrape"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-neutral-200 transition hover:bg-white hover:text-black active:scale-95"
          >
            <ScrapeIcon className="h-4 w-4 text-violet-400" />
            Scrape Batch
          </Link>
          <Link
            href="/admin/manage-stream-links"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-neutral-200 transition hover:bg-white hover:text-black active:scale-95"
          >
            <Link2 className="h-4 w-4 text-amber-400" />
            Stream Links
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-neutral-200 transition hover:bg-white hover:text-black active:scale-95"
          >
            <Users className="h-4 w-4 text-indigo-400" />
            Manage Users
          </Link>
          <Link
            href="/admin/comments"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-neutral-200 transition hover:bg-white hover:text-black active:scale-95"
          >
            <CommentsIcon className="h-4 w-4 text-emerald-400" />
            Comments
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-neutral-200 transition hover:bg-white hover:text-black active:scale-95"
          >
            <Film className="h-4 w-4 text-pink-400" />
            System Settings
          </Link>
        </div>
      </div>

      {/* Recent Videos Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4 md:p-5">
          <div>
            <h2 className="text-base font-bold text-white">Recently Added Videos</h2>
            <p className="text-xs text-neutral-400">Latest media entries in your database.</p>
          </div>
          <Link href="/admin/videos" className="text-xs font-bold text-violet-400 hover:underline">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase font-bold text-neutral-400">
              <tr>
                <th className="p-4">Video</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Views</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats?.recentVideos?.map((v) => (
                <tr key={v.uuid} className="hover:bg-white/[0.02] transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                        {v.thumbnail && <Image src={v.thumbnail} alt="" fill className="object-cover" unoptimized />}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <Link href={`/watch/${v.slug || v.uuid}`} target="_blank" className="font-semibold text-white hover:text-violet-400 line-clamp-1">
                          {v.title}
                        </Link>
                        <p className="text-[10px] text-neutral-500 font-mono">{v.uuid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-neutral-300">{v.channelName || "Unknown"}</span>
                  </td>
                  <td className="p-4 font-mono text-neutral-400">{formatDuration(v.duration || 0)}</td>
                  <td className="p-4 font-semibold text-white">{formatViews(v.views)}</td>
                  <td className="p-4">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/watch/${v.slug || v.uuid}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white hover:text-black transition active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" /> Watch
                    </Link>
                  </td>
                </tr>
              ))}
              {(!stats?.recentVideos || stats.recentVideos.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-neutral-500">
                    No videos available in database yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
