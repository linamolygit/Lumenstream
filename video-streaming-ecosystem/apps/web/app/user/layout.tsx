"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { BrandLogo } from "@/components/brand-logo";
import {
  House as Home,
  SquaresFour as LayoutDashboard,
  ClockCounterClockwise as History,
  BookmarkSimple as Bookmark,
  DownloadSimple as Download,
  Sparkle as Sparkles,
  Fire as TrendingUp,
  ChatText as MessageSquare,
  UserCircle,
  Gear as Settings,
  MagnifyingGlass as Search,
  Bell,
  Play,
  List as Menu,
} from "@phosphor-icons/react";
import { Heart, LogOut, ChevronLeft, ChevronRight, X } from "lucide-react";

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "YOUR LIBRARY",
    items: [
      { href: "/user/history", label: "Watch History", icon: History },
      { href: "/user/saved", label: "Saved Videos", icon: Bookmark },
      { href: "/user/liked", label: "Liked Videos", icon: Heart },
      { href: "/user/downloads", label: "Downloads", icon: Download },
    ],
  },
  {
    label: "DISCOVER",
    items: [
      { href: "/user/recommended", label: "Recommended", icon: Sparkles },
      { href: "/trending", label: "Trending", icon: TrendingUp },
    ],
  },
  {
    label: "ACTIVITY",
    items: [{ href: "/user/comments", label: "My Comments", icon: MessageSquare }],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/user/profile", label: "Profile", icon: UserCircle },
      { href: "/user/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [loading, user, router]);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500" />
          </div>
          <p className="text-sm text-neutral-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex h-full flex-col ${
        collapsed && !mobile ? "items-center" : ""
      }`}
    >
      {/* Logo */}
      <div
        className={`mb-6 flex items-center gap-2.5 px-1 ${
          collapsed && !mobile ? "justify-center" : ""
        }`}
      >
        <BrandLogo showText={!collapsed || mobile} size="sm" />
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "pt-3" : ""}>
            {section.label && (!collapsed || mobile) && (
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-widest text-neutral-600">
                {section.label}
              </p>
            )}
            {section.label && (collapsed && !mobile) && (
              <div className="mb-1 h-px w-8 bg-neutral-800 mx-auto" />
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed && !mobile ? item.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    collapsed && !mobile ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-violet-500/15 text-violet-300 shadow-sm"
                      : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet-400" />
                  )}
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      active ? "text-violet-400" : ""
                    }`}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {(!collapsed || mobile) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User card + Logout */}
      <div className={`mt-4 space-y-1 border-t border-white/5 pt-4`}>
        {(!collapsed || mobile) ? (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-[10px] text-neutral-500">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 transition-all hover:bg-red-500/10 hover:text-red-400 ${
            collapsed && !mobile ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 border-r border-white/[0.06] bg-[#0d0d16] transition-all duration-300 ease-in-out ${
          collapsed ? "w-[68px]" : "w-[240px]"
        } relative p-3`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#14141f] text-neutral-400 shadow-md transition hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 border-r border-white/[0.06] bg-[#0d0d16] p-4 transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-500 hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent mobile />
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0d0d16]/80 px-4 py-3 backdrop-blur-xl md:px-5">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-white/5 hover:text-white md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search bar */}
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <input
              type="search"
              placeholder="Search videos..."
              className="w-full rounded-full border border-white/[0.06] bg-white/[0.04] py-2 pl-9 pr-4 text-sm text-neutral-300 placeholder-neutral-600 outline-none transition focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
                }
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-lg p-2 text-neutral-500 transition hover:bg-white/5 hover:text-white">
              <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
            </button>
            <Link
              href="/user/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white ring-2 ring-violet-500/0 transition hover:ring-violet-500/40"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
