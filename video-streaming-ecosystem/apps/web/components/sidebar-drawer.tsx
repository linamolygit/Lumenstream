"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Home,
  Heart,
  History,
  Bookmark,
  TrendingUp,
  LogIn,
  UserPlus,
  LogOut,
  Sun,
  Moon,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ open, onClose }: SidebarDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel with Custom Cubic Bezier Easing */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-neutral-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#09090b] text-neutral-900 dark:text-white"
          >
            <div className="space-y-6">
              {/* Header: Logo + Brand Name + Close X Button */}
              <div className="flex items-center justify-between">
                <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
                  <Image
                    src="/logo-square.png"
                    alt="Lumenstream"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain rounded-xl"
                  />
                  <span className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">
                    Lumenstream
                  </span>
                </Link>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white transition"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Appearance Row with Custom Pill Switch */}
              <div className="flex items-center justify-between border-y border-neutral-100 py-3.5 dark:border-white/10">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Appearance
                </span>
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={cn(
                    "relative flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-300",
                    isDark ? "bg-neutral-800 border border-white/15" : "bg-neutral-200 border border-neutral-300"
                  )}
                  aria-label="Toggle appearance theme"
                >
                  <motion.div
                    animate={{ x: isDark ? 22 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-colors",
                      isDark ? "bg-violet-600 text-white" : "bg-white text-amber-500"
                    )}
                  >
                    {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  </motion.div>
                </button>
              </div>

              {/* Main Navigation Items */}
              <nav className="space-y-1.5">
                {/* Home */}
                <Link
                  href="/"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-95",
                    pathname === "/"
                      ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 font-extrabold"
                      : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
                  )}
                >
                  <Home className="h-5 w-5" /> Home
                </Link>

                {/* Logged-in User Links */}
                {user ? (
                  <>
                    <Link
                      href="/user/liked"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-95",
                        pathname === "/user/liked"
                          ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 font-extrabold"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
                      )}
                    >
                      <Heart className="h-5 w-5 text-red-500" /> Liked
                    </Link>

                    <Link
                      href="/user/history"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-95",
                        pathname === "/user/history"
                          ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 font-extrabold"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
                      )}
                    >
                      <History className="h-5 w-5" /> History
                    </Link>

                    <Link
                      href="/user/saved"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-95",
                        pathname === "/user/saved"
                          ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 font-extrabold"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
                      )}
                    >
                      <Bookmark className="h-5 w-5 text-amber-500" /> Saved
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-95 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                        )}
                      >
                        <Shield className="h-5 w-5" /> Admin Portal
                      </Link>
                    )}
                  </>
                ) : (
                  /* Guest User Links */
                  <>
                    <Link
                      href="/trending"
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 active:scale-95",
                        pathname === "/trending"
                          ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 font-extrabold"
                          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
                      )}
                    >
                      <TrendingUp className="h-5 w-5 text-amber-500" /> Trending Videos
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Bottom Account Card & Action Section */}
            <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-white/10">
              {user ? (
                <>
                  {/* Account Info Card (Exact Reference Screenshot Match) */}
                  <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-100 p-3.5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white shadow-md">
                      {(user.name || user.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                        {user.name || "Rishav"}
                      </p>
                      <p className="text-[10px] font-extrabold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                        ACCOUNT TYPE - {user.role === "admin" ? "ADMIN" : "FREE"}
                      </p>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition active:scale-95"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                /* Guest Auth Section */
                <div className="space-y-2">
                  <Link
                    href="/sign-in"
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-500 transition active:scale-95 shadow-lg shadow-violet-600/25"
                  >
                    <LogIn className="h-4 w-4" /> Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 py-3 text-sm font-bold text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition active:scale-95"
                  >
                    <UserPlus className="h-4 w-4" /> Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
