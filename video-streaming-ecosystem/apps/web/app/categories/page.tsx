"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Compass,
  Waves,
  Car,
  Mountain,
  Coffee,
  Sparkles,
} from "lucide-react";

const categories = [
  { slug: "travel", label: "Travel", icon: Compass, desc: "Journeys & places" },
  { slug: "nature", label: "Nature", icon: Waves, desc: "Ocean, forest, sky" },
  { slug: "tech", label: "Tech & Cars", icon: Car, desc: "Speed & machines" },
  { slug: "adventure", label: "Adventure", icon: Mountain, desc: "Outdoors" },
  { slug: "lifestyle", label: "Lifestyle", icon: Coffee, desc: "Calm & daily life" },
  { slug: "featured", label: "Featured", icon: Sparkles, desc: "Editor picks" },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Categories
        </h1>
        <p className="mt-2 text-neutral-500">Browse streams by theme</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/search?q=${encodeURIComponent(c.label)}`}
                className="flex items-center gap-4 rounded-[20px] border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
                  <c.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{c.label}</p>
                  <p className="text-sm text-neutral-400">{c.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
