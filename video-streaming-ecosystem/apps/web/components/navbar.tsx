"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  MagnifyingGlass as Search,
  Moon,
  Sun,
  Bell,
  User,
  SignOut as LogOut,
  ShieldCheck as Shield,
  Heart,
  BookmarkSimple as Bookmark,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0f0f0f]/90 px-3 py-2 md:px-6">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo-dark.png"
            alt="LumenStream"
            width={150}
            height={38}
            priority
            className="hidden dark:block h-7 md:h-8 w-auto object-contain"
          />
          <Image
            src="/logo-light.png"
            alt="LumenStream"
            width={150}
            height={38}
            priority
            className="block dark:hidden h-7 md:h-8 w-auto object-contain"
          />
        </Link>

        {/* Center: YouTube Style Search Bar */}
        <form
          onSubmit={handleSearch}
          className="flex flex-1 items-center justify-center max-w-2xl px-2"
        >
          <div className="flex w-full items-center overflow-hidden rounded-full border border-neutral-300 bg-neutral-50 focus-within:border-violet-600 focus-within:ring-1 focus-within:ring-violet-600 dark:border-[#303030] dark:bg-[#121212]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full bg-transparent px-4 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-white dark:placeholder:text-[#aaa]"
            />
            <button
              type="submit"
              className="flex items-center justify-center bg-neutral-200 px-5 py-2 hover:bg-neutral-300 dark:bg-[#222] dark:hover:bg-[#333] transition"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </form>

        {/* Right: Controls & User Avatar */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Bell */}
          <button
            className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#272727] transition"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#272727] transition"
            aria-label="Toggle theme"
            title="Toggle Light/Dark Theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Profile Circle / YouTube Sign-In Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 font-bold text-white shadow-sm ring-2 ring-violet-500/30 hover:ring-violet-500 transition"
              >
                {(user.name || user.email || "U")[0].toUpperCase()}
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/5 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white"
                  onMouseLeave={() => setProfileOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-white/10">
                    <p className="font-semibold text-sm truncate">{user.name || "User"}</p>
                    <p className="text-xs text-neutral-500 truncate dark:text-neutral-400">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="h-4 w-4" /> My Dashboard
                    </Link>
                    <Link
                      href="/dashboard?tab=liked"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Heart className="h-4 w-4 text-red-500" /> Liked Videos
                    </Link>
                    <Link
                      href="/dashboard?tab=saved"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Bookmark className="h-4 w-4 text-amber-500" /> Saved Playlist
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Shield className="h-4 w-4" /> Admin Portal
                      </Link>
                    )}
                  </div>

                  <div className="pt-1 border-t border-neutral-100 dark:border-white/10">
                    <button
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-500/20 dark:text-sky-400 dark:border-sky-400/40 transition"
            >
              <User className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
