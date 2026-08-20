"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if admin is already authenticated
  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) {
          router.replace(nextParam);
        }
      })
      .catch(() => {});
  }, [nextParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to authenticate admin session");
      }

      // Store local auth state if needed
      if (data.token) {
        localStorage.setItem("admin_token", data.token);
      }

      setSuccess("Admin authentication successful. Redirecting...");
      setTimeout(() => {
        router.replace(nextParam);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-white font-sans antialiased flex items-center justify-center p-4">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-2xl sm:p-10">
          {/* Header & Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 flex items-center gap-2">
              <BrandLogo size="lg" />
              <span className="rounded-md bg-violet-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                ADMIN
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Restricted Portal. Authorized Admin Access Only.
            </p>
          </div>

          {/* Error / Success Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Admin Username / Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lumenstream.com or rishav9801"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-violet-500 focus:bg-white/10 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Admin Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-violet-500 focus:bg-white/10 focus:ring-1 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Admin...</span>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-[11px] text-neutral-500">
            Protected by LumenStream High-Security Admin Authentication System.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
