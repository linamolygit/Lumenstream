"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import {
  SquaresFour as OverviewIcon,
  VideoCamera as VideosIcon,
  MagnifyingGlassPlus as ScrapeIcon,
  LinkSimple as StreamLinksIcon,
  FolderSimple as CategoriesIcon,
  UsersThree as UsersIcon,
  ChatText as CommentsIcon,
  TrendUp as AnalyticsIcon,
  ClipboardText as ScrapeLogsIcon,
  Wrench as ToolsIcon,
  Gear as SettingsIcon,
  GlobeHemisphereWest as WordpressIcon,
  UserCircle as ProfileIcon,
  SignOut as LogoutIcon,
  ArrowSquareOut as ViewSiteIcon,
  List as MenuIcon,
  X as CloseIcon,
  Bell,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
};

type NavSection = {
  label: string | null;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Overview", icon: OverviewIcon, exact: true },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { href: "/admin/videos", label: "All Videos", icon: VideosIcon },
      { href: "/admin/scrape", label: "Scrape Videos", icon: ScrapeIcon },
      { href: "/admin/manage-stream-links", label: "Stream Links", icon: StreamLinksIcon },
      { href: "/admin/categories", label: "Categories", icon: CategoriesIcon },
    ],
  },
  {
    label: "USERS & ENGAGEMENT",
    items: [
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/comments", label: "Comments", icon: CommentsIcon },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: AnalyticsIcon },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/admin/scrape-logs", label: "Scrape Logs", icon: ScrapeLogsIcon },
      { href: "/admin/tools", label: "Tools", icon: ToolsIcon },
      { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
  {
    label: "INTEGRATIONS",
    items: [
      { href: "/admin/wordpress", label: "WordPress", icon: WordpressIcon },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/sign-in");
      else if (user.role !== "admin") router.replace("/user/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/sign-in");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans antialiased">
      {/* Top Navbar for Mobile & Header Controls */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-black/80 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Logo" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-black tracking-tight text-white">
              LUMENSTREAM <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">ADMIN</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition hover:bg-white/10 hover:text-white"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-violet-400" />}
          </button>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:bg-white hover:text-black"
          >
            <ViewSiteIcon className="h-4 w-4" />
            View Website
          </Link>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white ring-2 ring-violet-500/30">
              {(user.name || "A")[0].toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold text-white line-clamp-1">{user.name || "Rishav"}</p>
              <p className="text-[10px] font-medium text-violet-400">Super Admin</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar Container */}
        <aside
          className={cn(
            "fixed inset-y-16 left-0 z-30 flex w-64 flex-col border-r border-white/[0.08] bg-black/95 px-3 py-4 transition-transform duration-300 md:static md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-none pr-1">
            {NAV_SECTIONS.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                {sec.label && (
                  <p className="px-3 text-[10px] font-extrabold tracking-wider text-neutral-500 uppercase">
                    {sec.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95",
                          active
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25 font-bold"
                            : "text-neutral-400 hover:bg-white/10 hover:text-white dark:hover:bg-white dark:hover:text-black"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", active ? "text-white" : "text-neutral-400 group-hover:text-current")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-white/[0.08] pt-3 space-y-1">
            <Link
              href="/admin/profile"
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-400 transition hover:bg-white/10 hover:text-white dark:hover:bg-white dark:hover:text-black active:scale-95",
                pathname === "/admin/profile" && "bg-violet-600 text-white font-bold"
              )}
            >
              <ProfileIcon className="h-4 w-4" />
              <span>Admin Profile</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300 active:scale-95"
            >
              <LogoutIcon className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#0a0a0f]">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
