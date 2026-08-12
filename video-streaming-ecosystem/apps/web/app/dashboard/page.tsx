"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Film,
  Eye,
  Plus,
  Upload,
  LayoutGrid,
  Link2,
  BarChart3,
  ArrowRight,
  Rocket,
  Shield,
  Users,
  Heart,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { formatDuration } from "@/lib/utils";

type MyVideo = {
  uuid: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  duration?: number;
  views?: number;
  createdAt?: string;
};

function formatViews(n = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(date?: string) {
  if (!date) return "";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

export default function DashboardOverviewPage() {
  const { user, token } = useAuth();
  const [videos, setVideos] = useState<MyVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/my-videos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : []);
      } catch {
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const totalViews = useMemo(
    () => videos.reduce((s, v) => s + (v.views || 0), 0),
    [videos]
  );

  const recent = videos.slice(0, 4);
  const firstName = user?.name?.split(" ")[0] || "there";

  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek = videos.filter(
    (v) => v.createdAt && new Date(v.createdAt).getTime() >= weekAgo
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome row */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Hi, {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1.5 max-w-lg text-[15px] text-neutral-500 dark:text-neutral-400">
            Welcome back! You&apos;re doing great. Create, manage and stream your videos with
            LumenStream.
          </p>
        </div>
        <p className="hidden max-w-xs text-right text-sm italic text-neutral-400 lg:block">
          &ldquo;Better video infrastructure for a brighter internet.&rdquo;
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
              <Film className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-300" />
          </div>
          <p className="mt-4 text-sm text-neutral-500">My Videos</p>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">
            {loading ? "—" : videos.length}
          </p>
          <p className="mt-2 text-xs text-emerald-600">
            ↑ {newThisWeek} new this week
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">Videos in your library</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
              <Eye className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-300" />
          </div>
          <p className="mt-4 text-sm text-neutral-500">Total Views</p>
          <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">
            {loading ? "—" : formatViews(totalViews)}
          </p>
          <p className="mt-2 text-xs text-emerald-600">Across all your videos</p>
          <p className="mt-0.5 text-xs text-neutral-400">Realtime from your library</p>
        </motion.div>

        {/* Add New CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href="/dashboard/add-video"
            className="flex h-full flex-col justify-between rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white shadow-lg shadow-violet-500/25 transition hover:opacity-95"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Plus className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <ArrowRight className="h-4 w-4 text-white/70" />
            </div>
            <div className="mt-6">
              <p className="text-lg font-bold">Add New</p>
              <p className="mt-1 text-sm text-white/75">
                Paste a URL and start streaming today.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700">
                <Upload className="h-3.5 w-3.5" />
                Add Video →
              </span>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Quick Actions
            </h2>
            <p className="text-sm text-neutral-400">Create, manage and grow your content.</p>
          </div>
          <Link
            href="/dashboard/my-videos"
            className="text-sm font-medium text-violet-600 hover:underline"
          >
            View all actions →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/dashboard/add-video",
              title: "Add New Video",
              desc: "Scrape and configure your video",
              icon: Upload,
            },
            {
              href: "/dashboard/my-videos",
              title: "Manage Library",
              desc: "Edit and organize your videos",
              icon: LayoutGrid,
            },
            {
              href: "/dashboard/my-videos",
              title: "Copy Stream Link",
              desc: "Get stream link instantly",
              icon: Link2,
            },
            {
              href: "/dashboard",
              title: "View Analytics",
              desc: "Track views and engagement",
              icon: BarChart3,
            },
          ].map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="group flex items-center gap-3 rounded-[20px] border border-black/[0.04] bg-white p-4 shadow-sm transition hover:border-violet-500/20 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
                <a.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {a.title}
                </p>
                <p className="text-xs text-neutral-400">{a.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-300 transition group-hover:text-violet-500" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Videos */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Your Recent Videos
            </h2>
            <p className="text-sm text-neutral-400">Latest videos from your library</p>
          </div>
          <Link
            href="/dashboard/my-videos"
            className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-white/10 dark:bg-zinc-900 dark:text-neutral-300"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-[20px] bg-white dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-black/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-900">
            <p className="text-sm text-neutral-500">No videos yet.</p>
            <Link
              href="/dashboard/add-video"
              className="mt-3 inline-flex text-sm font-semibold text-violet-600 hover:underline"
            >
              Add your first video →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((v) => (
              <Link
                key={v.uuid}
                href={`/watch/${v.slug}`}
                className="group overflow-hidden rounded-[20px] border border-black/[0.04] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
              >
                <div className="relative aspect-video bg-neutral-100 dark:bg-zinc-800">
                  {v.thumbnail ? (
                    <Image
                      src={v.thumbnail}
                      alt={v.title}
                      fill
                      className="object-cover transition group-hover:scale-[1.03]"
                      sizes="25vw"
                      unoptimized
                    />
                  ) : null}
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatDuration(v.duration || 0)}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 dark:text-white">
                    {v.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {formatViews(v.views || 0)} views
                    {v.createdAt ? ` · ${timeAgo(v.createdAt)}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bottom feature strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Rocket, t: "More videos. More possibilities.", d: "Powerful tools for creators." },
          { icon: Eye, t: "Fast Streaming", d: "Global CDN delivery" },
          { icon: Shield, t: "Secure & Reliable", d: "Enterprise-grade" },
          { icon: Heart, t: "LumenStream", d: "A platform for your story." },
        ].map((x) => (
          <div
            key={x.t}
            className="flex items-center gap-3 rounded-[20px] border border-black/[0.04] bg-white p-4 dark:border-white/10 dark:bg-zinc-900"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
              <x.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{x.t}</p>
              <p className="text-xs text-neutral-400">{x.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
