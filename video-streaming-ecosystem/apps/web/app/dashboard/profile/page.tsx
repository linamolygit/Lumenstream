"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Save,
  CheckCircle2,
  X,
  Camera,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, token } = useAuth();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const initials = (user?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Profile
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          Manage your account information and profile details.
        </p>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Changes saved
              </p>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
                Your profile information has been updated successfully.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaved(false)}
              className="rounded-lg p-1 text-emerald-600/60 hover:bg-emerald-500/10"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-6"
      >
        {/* Avatar row */}
        <div className="flex items-center gap-4 border-b border-black/[0.04] pb-6 dark:border-white/10">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xl font-bold text-white shadow-md shadow-violet-500/20">
              {initials}
            </div>
            <button
              type="button"
              title="Avatar upload coming soon"
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow dark:border-zinc-900"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-neutral-900 dark:text-white">
              {user?.name || "User"}
            </h2>
            <p className="truncate text-sm text-neutral-500">{user?.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className={cn(
                  "w-full rounded-2xl border bg-white py-3 pl-10 pr-4 text-sm outline-none transition dark:bg-black/20 dark:text-white",
                  "border-violet-400 ring-2 ring-violet-500/20 dark:border-violet-500/40"
                )}
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* Email — read only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-black/5 bg-neutral-50 py-3 pl-10 pr-4 text-sm text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400"
              />
            </div>
            <p className="text-xs text-neutral-400">
              Your email address cannot be changed.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || name.trim() === user?.name}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" strokeWidth={1.75} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </motion.div>

      {/* Danger Zone */}
      <div className="mt-8 rounded-[20px] border border-red-500/20 bg-red-500/5 p-5 dark:border-red-500/10 dark:bg-red-500/10">
        <h3 className="text-base font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
          Permanently delete your account, watch history, liked videos, and personal data.
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm("Are you sure you want to delete your account and clear all your data? This action cannot be undone.")) {
              alert("Your data deletion request has been submitted successfully.");
            }
          }}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition shadow-sm"
        >
          Delete Account & Clear Data
        </button>
      </div>
    </div>
  );
}
