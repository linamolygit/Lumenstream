"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { motion } from "framer-motion";
import { Film, PlusCircle, Eye } from "lucide-react";
import Link from "next/link";

export default function UserDashboard() {
  const { token, user } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/user/my-videos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome, {user?.name || "User"}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your scraped videos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { label: "My Videos", value: videos.length, icon: Film },
          { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye },
          { label: "Add New", value: "Scrape", icon: PlusCircle, link: "/dashboard/add-video" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-6"
          >
            {card.link ? (
              <Link href={card.link} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold mt-1 text-primary">{card.value}</p>
                </div>
                <card.icon className="h-8 w-8 text-primary/60" />
              </Link>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className="h-8 w-8 text-primary/60" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard/add-video"
          className="glass px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-white/10 transition"
        >
          + Add Video
        </Link>
        <Link
          href="/dashboard/my-videos"
          className="glass px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-white/10 transition"
        >
          View My Videos
        </Link>
      </div>
    </div>
  );
}
