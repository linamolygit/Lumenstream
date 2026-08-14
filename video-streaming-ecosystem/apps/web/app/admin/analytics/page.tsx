"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  Link2,
  Trophy,
  Play,
  Activity,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type Video = {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  views?: number;
  status?: string;
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
  recentVideos?: Video[];
};

import { formatViews } from "@/lib/format-views";

function timeAgo(date?: string) {
  if (!date) return "";
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Simple SVG area + line chart */
function LineChart({ points }: { points: number[] }) {
  if (!points.length) return null;
  const max = Math.max(...points, 1);
  const w = 560;
  const h = 180;
  const pad = 12;
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (p / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1][0]},${h - pad} L${
    coords[0][0]
  },${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {coords.length > 0 && (
        <circle
          cx={coords[coords.length - 1][0]}
          cy={coords[coords.length - 1][1]}
          r="4"
          fill="#8B5CF6"
        />
      )}
    </svg>
  );
}

function BarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex h-44 items-end gap-3 px-1">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-1 flex-col items-center gap-2"
        >
          <span className="text-[10px] font-medium text-neutral-400">
            {formatViews(item.value)}
          </span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400"
            style={{
              height: `${Math.max(8, (item.value / max) * 100)}%`,
            }}
          />
          <span className="truncate text-[10px] text-neutral-500">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7D" | "1M" | "3M">("7D");

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const [sRes, vRes] = await Promise.all([
          fetch(`${apiBase}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBase}/api/admin/videos`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const sData = sRes.ok ? await sRes.json() : null;
        const vData = vRes.ok ? await vRes.json() : [];
        setStats(sData);
        setVideos(Array.isArray(vData) ? vData : vData.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, apiBase]);

  const totalViews =
    stats?.totalViews || videos.reduce((s, v) => s + (v.views || 0), 0);
  const activeVideos =
    stats?.activeVideos ||
    videos.filter((v) => v.status === "active").length;

  // Top videos by views
  const topVideos = useMemo(
    () =>
      [...videos]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5),
    [videos]
  );

  // Aggregate views per channel from real DB videos
  const topChannels = useMemo(() => {
    const map = new Map<
      string,
      { name: string; views: number; logo?: string | null }
    >();
    for (const v of videos) {
      const key = v.channelName || "Unknown";
      const prev = map.get(key) || {
        name: key,
        views: 0,
        logo: v.channelLogo,
      };
      prev.views += v.views || 0;
      if (!prev.logo && v.channelLogo) prev.logo = v.channelLogo;
      map.set(key, prev);
    }
    return [...map.values()]
      .sort((a, b) => b.views - a.views)
      .slice(0, 4);
  }, [videos]);

  // Derived weekly series (replaced later with real daily counts)
  const series = useMemo(() => {
    const base = Math.max(totalViews / 7, 1);
    const noise = [0.4, 0.55, 0.5, 0.7, 0.65, 0.9, 1.15];
    return noise.map((n) => Math.round(base * n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalViews, range]);

  // Title-keyword category buckets from real videos
  const categoryBars = useMemo(() => {
    const buckets: Record<string, number> = { Other: 0 };
    for (const v of videos) {
      const t = (v.title || "").toLowerCase();
      let key = "Other";
      if (/travel|mountain|road|desert|island/.test(t)) key = "Travel";
      else if (/nature|ocean|underwater|lake|forest/.test(t)) key = "Nature";
      else if (/car|speed|tech|city/.test(t)) key = "Tech";
      else if (/life|calm|coffee|minimal/.test(t)) key = "Lifestyle";
      buckets[key] = (buckets[key] || 0) + (v.views || 0);
    }
    return Object.entries(buckets)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [videos]);

  const metricCards = [
    {
      label: "Total Views",
      value: formatViews(totalViews),
      icon: Eye,
      hint: "Across all videos",
      danger: false,
    },
    {
      label: "Users",
      value: formatViews(stats?.totalUsers || 0),
      icon: Users,
      hint: "Registered accounts",
      danger: false,
    },
    {
      label: "Library Size",
      value: String(stats?.totalVideos || videos.length),
      icon: Play,
      hint: "Total videos hosted",
      danger: false,
    },
    {
      label: "Active Videos",
      value: String(activeVideos),
      icon: TrendingUp,
      hint: "Ready to stream",
      danger: false,
    },
    {
      label: "Dead Links",
      value: String(stats?.deadVideos || 0),
      icon: Link2,
      hint: "Need refresh",
      danger: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
            Track performance, engagement and key metrics for your hosted
            videos.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs text-neutral-500 dark:border-white/10 dark:bg-zinc-900">
          <Clock className="h-3.5 w-3.5" />
          Live library stats
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {metricCards.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-[20px] border border-black/[0.04] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2 text-[#A78BFA]">
              <m.icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-xs font-medium text-neutral-500">
                {m.label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
              {loading ? "—" : m.value}
            </p>
            <p
              className={cn(
                "mt-1 text-[11px]",
                m.danger ? "text-red-500" : "text-emerald-600"
              )}
            >
              {m.hint}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Views chart + Top channels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Line chart */}
        <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Views Overview
              </h2>
            </div>
            <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/5">
              {(["7D", "1M", "3M"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    range === r
                      ? "bg-white text-violet-700 shadow-sm dark:bg-zinc-800 dark:text-violet-300"
                      : "text-neutral-500"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl bg-neutral-100 dark:bg-zinc-800" />
          ) : (
            <LineChart points={series} />
          )}
          <p className="mt-2 text-[11px] text-neutral-400">
            Chart derived from current library volume — daily view tracking
            coming soon.
          </p>
        </div>

        {/* Top channels */}
        <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Top Channels
              </h2>
            </div>
            <Link
              href="/admin/videos"
              className="text-xs font-medium text-violet-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <ul className="space-y-3">
            {topChannels.length === 0 && (
              <li className="text-sm text-neutral-400">No channel data yet</li>
            )}
            {topChannels.map((ch, idx) => (
              <li key={ch.name} className="flex items-center gap-3">
                <span className="w-4 text-xs font-semibold text-neutral-400">
                  {idx + 1}
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20">
                  {ch.logo ? (
                    <Image
                      src={ch.logo}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    ch.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {ch.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatViews(ch.views)} views
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Category bars + Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bar chart */}
        <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Views by Theme
            </h2>
          </div>
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl bg-neutral-100 dark:bg-zinc-800" />
          ) : categoryBars.every((c) => c.value === 0) ? (
            <p className="py-16 text-center text-sm text-neutral-400">
              Not enough view data
            </p>
          ) : (
            <BarChart items={categoryBars} />
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Recent Activity
            </h2>
            <Link
              href="/admin/videos"
              className="text-xs font-medium text-violet-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <ul className="space-y-3">
            {(stats?.recentVideos || videos.slice(0, 3)).map((v) => (
              <li key={v.uuid} className="flex items-center gap-3">
                <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-zinc-800">
                  {v.thumbnail ? (
                    <Image
                      src={v.thumbnail}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {v.title}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatViews(v.views || 0)} views
                    {v.createdAt ? ` · ${timeAgo(v.createdAt)}` : ""}
                  </p>
                </div>
                <Link href={`/watch/${v.slug}`} className="text-violet-500">
                  <Play className="h-4 w-4" />
                </Link>
              </li>
            ))}
            {!loading &&
              !(stats?.recentVideos?.length || videos.length) && (
                <li className="text-sm text-neutral-400">No recent videos</li>
              )}
          </ul>
        </div>
      </div>

      {/* Top performing videos table */}
      <div className="overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="border-b border-black/[0.04] px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Top Performing Videos
          </h2>
        </div>

        {/* Desktop header */}
        <div className="hidden grid-cols-12 gap-3 border-b border-black/[0.04] px-5 py-2.5 text-xs font-medium text-neutral-400 dark:border-white/10 md:grid">
          <div className="col-span-6">Title</div>
          <div className="col-span-2">Views</div>
          <div className="col-span-2">Channel</div>
          <div className="col-span-2">Status</div>
        </div>

        <ul className="divide-y divide-black/[0.04] dark:divide-white/5">
          {topVideos.map((v) => (
            <li
              key={v.uuid}
              className="grid grid-cols-1 items-center gap-3 px-5 py-3 md:grid-cols-12"
            >
              <div className="flex items-center gap-3 md:col-span-6">
                <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-zinc-800">
                  {v.thumbnail ? (
                    <Image
                      src={v.thumbnail}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <Link
                  href={`/watch/${v.slug}`}
                  className="line-clamp-1 text-sm font-semibold text-neutral-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-300"
                >
                  {v.title}
                </Link>
              </div>

              <div className="text-sm text-neutral-500 md:col-span-2">
                {formatViews(v.views || 0)}
              </div>

              <div className="truncate text-sm text-neutral-500 md:col-span-2">
                {v.channelName || "—"}
              </div>

              <div className="md:col-span-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    v.status === "active"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-white/10"
                  )}
                >
                  {v.status || "—"}
                </span>
              </div>
            </li>
          ))}
          {!loading && topVideos.length === 0 && (
            <li className="p-8 text-center text-sm text-neutral-400">
              No videos yet
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
