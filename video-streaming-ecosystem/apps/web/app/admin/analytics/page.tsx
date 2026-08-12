"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { motion } from "framer-motion";
import { Eye, Video, Users, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    }
    if (token) load();
  }, [token]);

  if (!stats) {
    return <div className="p-10 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform performance overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {[
          { label: "Total Videos", value: stats.totalVideos, icon: Video },
          { label: "Total Views", value: (stats.totalViews || 0).toLocaleString(), icon: Eye },
          { label: "Active Videos", value: stats.activeVideos, icon: TrendingUp },
          { label: "Users", value: stats.totalUsers, icon: Users },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
              </div>
              <item.icon className="h-8 w-8 text-primary/60" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top / Recent */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Recently Added Videos</h2>
        <div className="space-y-3">
          {stats.recentVideos?.map((v: any) => (
            <div key={v.uuid} className="flex items-center gap-4">
              <div className="h-10 w-16 rounded bg-muted overflow-hidden">
                {v.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} className="h-full w-full object-cover" alt="" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.title}</p>
                <p className="text-xs text-muted-foreground">{(v.views || 0).toLocaleString()} views • {v.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
