"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-[#ede9fe] dark:from-[#0a0a0f] dark:via-[#12121a] dark:to-[#1a1025]">
      {/* Soft orbs */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/20" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute right-1/3 top-10 h-40 w-40 rounded-full bg-fuchsia-200/50 blur-3xl dark:bg-fuchsia-500/10" />

      {/* Theme toggle */}
      <div className="absolute right-6 top-6 z-20">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
        >
          <Sun className="h-3.5 w-3.5" />
          Theme
          <span
            className={cn(
              "relative h-5 w-9 rounded-full transition",
              theme === "dark" ? "bg-violet-500" : "bg-neutral-300"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                theme === "dark" ? "left-4" : "left-0.5"
              )}
            />
          </span>
          <Moon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-4 py-16 lg:flex-row lg:items-stretch lg:gap-10">
        {/* LEFT — Login card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="rounded-[28px] border border-white/60 bg-white/70 p-8 shadow-[0_20px_60px_rgba(80,60,180,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10">
            {/* Brand */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold text-white shadow-lg shadow-violet-500/30">
                L
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                LumenStream
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Clean streaming. No clutter.
              </p>
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Welcome Back
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Sign in to continue to your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-2xl border border-black/5 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none ring-violet-500/30 transition placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-black/5 bg-white/80 py-3 pl-10 pr-11 text-sm outline-none ring-violet-500/30 transition placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-violet-600 hover:underline dark:text-violet-400"
              >
                Create an Account
              </Link>
            </p>

            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
              <Link href="/privacy" className="hover:text-neutral-600">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-neutral-600">
                Terms of Service
              </Link>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
            <Shield className="h-3.5 w-3.5" />
            Your data is encrypted and private.
          </p>
        </motion.div>

        {/* RIGHT — LumenStream preview panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="hidden w-full max-w-lg lg:block"
        >
          <div className="h-full rounded-[28px] border border-white/60 bg-white/50 p-6 shadow-[0_20px_60px_rgba(80,60,180,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 font-bold text-white">
                L
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  Welcome to LumenStream
                </p>
                <p className="text-sm text-neutral-500">Scrape. Stream. Share.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Clean Player", desc: "No ads clutter" },
                { label: "Stream Links", desc: "One-click copy" },
                { label: "Multi-site", desc: "Paste any URL" },
                { label: "Dashboard", desc: "Track your videos" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/70 bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
              <p className="text-sm font-semibold">Start streaming in minutes</p>
              <p className="mt-1 text-xs text-white/80">
                Add a video URL, scrape metadata, and share a clean stream link.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
