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
  Phone,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();

  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (authMethod === "email") {
        await login(email, password);
      } else {
        if (!otpSent) {
          if (!phone || phone.length < 10) throw new Error("Please enter a valid 10-digit mobile number");
          setOtpSent(true);
          setSuccess("OTP sent successfully to your mobile number");
          setTimeout(() => setSuccess(""), 4000);
        } else {
          if (otp.length !== 6) throw new Error("Please enter valid 6-digit OTP");
          await login(`${phone}@lumenstream.app`, "default_phone_pass");
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    alert("Redirecting to Google Authentication...");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-[#ede9fe] dark:from-[#0a0a0f] dark:via-[#12121a] dark:to-[#1a1025]">
      {/* Soft orbs */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/20" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-600/20" />

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
          <div className="rounded-[28px] border border-white/60 bg-white/70 p-8 shadow-[0_20px_60px_rgba(80,60,180,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:p-10">
            {/* Brand */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold text-white shadow-lg shadow-violet-500/30">
                L
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                LumenStream
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Welcome back! Sign in to continue.
              </p>
            </div>

            {/* Auth Mode Toggle (Email vs Mobile OTP) */}
            <div className="mb-6 flex rounded-2xl border border-black/5 bg-neutral-100/80 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("email");
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold transition",
                  authMethod === "email"
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-violet-600 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                )}
              >
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("phone");
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold transition",
                  authMethod === "phone"
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-violet-600 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                )}
              >
                Mobile Phone OTP
              </button>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white py-3 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
              <span className="text-[11px] font-medium text-neutral-400">OR</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMethod === "email" ? (
                <>
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
                </>
              ) : (
                <>
                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="tel"
                        required
                        disabled={otpSent}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full rounded-2xl border border-black/5 bg-white/80 py-3 pl-10 pr-4 text-sm outline-none ring-violet-500/30 transition placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* 6-Digit OTP */}
                  {otpSent && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        Enter 6-Digit Verification OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="6-digit OTP"
                        className="w-full rounded-2xl border border-black/5 bg-white/80 py-3 px-4 text-center text-lg font-bold tracking-widest outline-none ring-violet-500/30 transition placeholder:text-neutral-400 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  )}
                </>
              )}

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
                  className="font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 text-xs"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              {success && (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:opacity-95 disabled:opacity-60"
              >
                {loading
                  ? "Processing..."
                  : authMethod === "phone" && !otpSent
                  ? "Send Mobile OTP"
                  : "Sign In"}
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
