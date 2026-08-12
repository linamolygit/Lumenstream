"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Film,
  CheckCircle2,
  Eye,
  Link2,
  Users,
  MoreHorizontal,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";

type RecentVideo = {
  uuid: string;
  title: string;
  slug?: string;
  thumbnail?: string | null;
  duration?: number;
  status: string;
  channelName?: string | null;
  channelLogo?: string | null;
  createdAt?: string;
};

type Stats = {
  totalVideos: number;
  activeVideos: number;
  deadVideos: number;
  hiddenVideos: number;
  processingVideos: number;
  totalViews: number;
  totalUsers: number;
  recentVideos: RecentVideo[];
};

function formatViews(n = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Active
      </span>
    );
  }
  if (s === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        <Clock className="h-3.5 w-3.5" /> Processing
      </span>
    );
  }
  if (s === "dead") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5" /> Dead
      </span>
    );
  }
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:bg-white/10">
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const cards = [
    {
      label: "Total Videos",
      value: stats?.totalVideos ?? 0,
      icon: Film,
      hint: "All videos in library",
      danger: false,
      raw: true,
    },
    {
      label: "Active",
      value: stats?.activeVideos ?? 0,
      icon: CheckCircle2,
      hint: "Ready to stream",
      danger: false,
      raw: true,
    },
    {
      label: "Views",
      value: formatViews(stats?.totalViews ?? 0),
      icon: Eye,
      hint: "Across all videos",
      danger: false,
      raw: false,
    },
    {
      label: "Dead Links",
      value: stats?.deadVideos ?? 0,
      icon: Link2,
      hint: "Need refresh",
      danger: true,
      raw: true,
    },
    {
      label: "Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      hint: "Registered accounts",
      danger: false,
      raw: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          Overview of your video streaming platform and content activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-[20px] border border-black/[0.04] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
              <card.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p className="mt-3 text-sm text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {loading
                ? "—"
                : card.raw
                ? Number(card.value).toLocaleString()
                : card.value}
            </p>
            <p
              className={cn(
                "mt-2 text-[11px]",
                card.danger ? "text-red-500" : "text-emerald-600"
              )}
            >
              {card.hint}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recently Added table */}
      <section className="overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            Recently Added
          </h2>
          <Link
            href="/admin/videos"
            className="text-sm font-medium text-violet-600 hover:underline"
          >
            View all videos →
          </Link>
        </div>

        {/* Table header — desktop */}
        <div className="hidden grid-cols-12 gap-3 border-b border-black/[0.04] px-5 py-2.5 text-xs font-medium text-neutral-400 dark:border-white/10 md:grid">
          <div className="col-span-5">Video</div>
          <div className="col-span-3">Channel</div>
          <div className="col-span-2">Added</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : !stats?.recentVideos?.length ? (
          <p className="p-10 text-center text-sm text-neutral-500">No videos yet</p>
        ) : (
          <ul className="divide-y divide-black/[0.04] dark:divide-white/5">
            {stats.recentVideos.map((v) => (
              <li
                key={v.uuid}
                className="grid grid-cols-1 items-center gap-3 px-5 py-3 md:grid-cols-12"
              >
                {/* Video */}
                <div className="flex items-center gap-3 md:col-span-5">
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-zinc-800">
                    {v.thumbnail ? (
                      <Image
                        src={v.thumbnail}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : null}
                    {!!v.duration && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] text-white">
                        {formatDuration(v.duration)}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-neutral-900 dark:text-white">
                    {v.title}
                  </p>
                </div>

                {/* Channel */}
                <div className="flex items-center gap-2 md:col-span-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20">
                    {v.channelLogo ? (
                      <Image
                        src={v.channelLogo}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      (v.channelName || "?").charAt(0)
                    )}
                  </div>
                  <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">
                    {v.channelName || "Unknown"}
                  </span>
                </div>

                {/* Date */}
                <div className="text-xs text-neutral-400 md:col-span-2">
                  {formatDate(v.createdAt)}
                </div>

                {/* Status */}
                <div className="md:col-span-1">
                  <StatusBadge status={v.status} />
                </div>

                {/* Actions */}
                <div className="flex justify-end md:col-span-1">
                  <Link
                    href={v.slug ? `/watch/${v.slug}` : "#"}
                    className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 dark:hover:bg-white/5"
                    title="Open watch page"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-black/[0.04] px-5 py-3 text-xs text-neutral-400 dark:border-white/10">
          <span>
            Showing 1 to {stats?.recentVideos?.length || 0} of{" "}
            {stats?.totalVideos || 0} results
          </span>
          <Link href="/admin/videos" className="font-medium text-violet-600 hover:underline">
            Open full table →
          </Link>
        </div>
      </section>
    </div>
  );
}
