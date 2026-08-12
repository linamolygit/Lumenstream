"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Video, Eye, Activity, Users, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    totalVideos: 0,
    activeVideos: 0,
    deadVideos: 0,
    totalViews: 0,
    totalUsers: 0,
    recentVideos: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  const cards = [
    {
      label: "Total Videos",
      value: stats.totalVideos,
      icon: Video,
      color: "from-violet-500 to-purple-500",
    },
    {
      label: "Active Videos",
      value: stats.activeVideos,
      icon: Activity,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Total Views",
      value: (stats.totalViews || 0).toLocaleString(),
      icon: Eye,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Dead Links",
      value: stats.deadVideos,
      icon: AlertTriangle,
      color: "from-red-500 to-orange-500",
    },
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "from-pink-500 to-rose-500",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your streaming platform
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass-card p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
              </div>
              <div
                className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center`}
              >
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Videos */}
      <div className="mt-10">
        <h2 className="font-semibold mb-4">Recently Added</h2>
        <div className="glass-card divide-y divide-border">
          {stats.recentVideos?.length === 0 ? (
            <p className="p-6 text-muted-foreground text-sm">No videos yet</p>
          ) : (
            stats.recentVideos.map((video: any) => (
              <div key={video.uuid} className="flex items-center gap-4 p-4">
                <div className="h-12 w-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  {video.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(video.views || 0).toLocaleString()} views • {video.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-10">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/scrape" className="glass px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-white/10 transition">
            + Scrape New Video
          </Link>
          <Link href="/admin/manage-stream-links" className="glass px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-white/10 transition">
            Manage Stream Links
          </Link>
        </div>
      </div>
    </div>
  );
}
