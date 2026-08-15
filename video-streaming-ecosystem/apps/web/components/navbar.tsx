"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Bell,
  User,
  Shield,
  Bookmark,
  Moon,
  Sun,
  LogOut,
  Heart,
  Menu,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { SidebarDrawer } from "./sidebar-drawer";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(5);

  const notifications = [
    { id: 1, text: "New recommended video added for you", time: "5m ago" },
    { id: 2, text: "Your saved playlist was updated", time: "1h ago" },
    { id: 3, text: "New HD streams available", time: "3h ago" },
    { id: 4, text: "Welcome back to Lumenstream!", time: "1d ago" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleBellClick = () => {
    setNotifOpen((prev) => !prev);
    if (unreadCount > 0) {
      setUnreadCount(0); // Clear badge on view
    }
  };

  const displayCount = unreadCount > 9 ? "9+" : unreadCount.toString();

  return (
    <>
      {/* Sidebar Drawer Component */}
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <header className="sticky top-0 z-40 w-full border-b border-black/5 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#0f0f0f]/95 px-3 py-2 md:px-6">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 md:gap-5">
          {/* Left: Hamburger Button + Brand Logo & Text */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Rounded Square Hamburger Button (iTeraPlay reference style) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:border-white/15 dark:bg-white/[0.05] dark:hover:bg-white/10 transition active:scale-95 text-neutral-700 dark:text-neutral-200"
              aria-label="Toggle menu"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo + Text */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image
                src="/logo-square.png"
                alt="Lumenstream Logo"
                width={34}
                height={34}
                priority
                className="h-8.5 w-8.5 object-contain rounded-xl"
              />
              <span className="text-lg font-black tracking-tight text-neutral-900 dark:text-white">
                Lumenstream
              </span>
            </Link>
          </div>

          {/* Center: Search Bar with Exact Custom Search SVG */}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-600 dark:text-neutral-300"
                >
                  <path d="m21 21-4.34-4.34" />
                  <circle cx="11" cy="11" r="8" />
                </svg>
              </button>
            </div>
          </form>

          {/* Right: Notification Bell, Theme Toggle & User Profile Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Notification Bell Button with Custom SVG & Realtime Badge */}
            <div className="relative">
              <button
                onClick={handleBellClick}
                className="relative rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#272727] transition active:scale-95"
                aria-label="Notifications"
                title="Notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 256 256"
                  className="text-neutral-700 dark:text-neutral-200"
                >
                  <rect width="256" height="256" fill="none" />
                  <path
                    d="M96,192a32,32,0,0,0,64,0"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <path
                    d="M56,104a72,72,0,0,1,144,0c0,35.82,8.3,64.6,14.9,76A8,8,0,0,1,208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,139.81,56,104Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                </svg>

                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#0f0f0f]">
                    {displayCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Dropdown Panel */}
              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-2xl border border-black/10 bg-white p-3 shadow-2xl dark:border-white/15 dark:bg-[#1a1a1a] dark:text-white z-50"
                  onMouseLeave={() => setNotifOpen(false)}
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2 dark:border-white/10 px-1">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Notifications</h4>
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">All caught up</span>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-white/5 py-1 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2.5 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition">
                        <p className="text-xs font-medium leading-tight text-neutral-800 dark:text-neutral-200">{n.text}</p>
                        <span className="mt-1 block text-[10px] font-semibold text-neutral-400">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Light / Dark Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#272727] transition"
              aria-label="Toggle theme"
              title="Toggle Light/Dark Theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-violet-600" />}
            </button>

            {/* Profile Circle Avatar / Sign-In Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 font-bold text-white shadow-sm ring-2 ring-violet-500/30 hover:ring-violet-500 transition active:scale-95"
                >
                  {(user.name || user.email || "U")[0].toUpperCase()}
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-2xl dark:border-white/15 dark:bg-[#1a1a1a] dark:text-white z-50"
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-white/10">
                      <p className="font-bold text-xs truncate">{user.name || "User"}</p>
                      <p className="text-[11px] text-neutral-500 truncate dark:text-neutral-400">{user.email}</p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <Link
                        href="/user/dashboard"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/10 transition"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="h-4 w-4" /> My Dashboard
                      </Link>
                      <Link
                        href="/user/liked"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/10 transition"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Heart className="h-4 w-4 text-red-500" /> Liked Videos
                      </Link>
                      <Link
                        href="/user/saved"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/10 transition"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Bookmark className="h-4 w-4 text-amber-500" /> Saved Library
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10 transition"
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
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition"
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
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3.5 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-500/20 dark:text-violet-400 dark:border-violet-400/40 transition active:scale-95"
              >
                <User className="h-4 w-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
