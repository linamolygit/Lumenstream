"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  Film,
  User,
  LogOut,
  Search,
  Bell,
  Crown,
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/add-video", label: "Add Video", icon: PlusCircle },
  { href: "/dashboard/my-videos", label: "My Videos", icon: Film },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-black">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-black/[0.04] bg-white/80 px-3 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 md:flex">
          <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white shadow-md shadow-violet-500/30">
              L
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">LumenStream</p>
              <p className="text-[10px] text-neutral-400">Stream · Share · Grow</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/15 dark:bg-violet-500/15 dark:text-violet-300"
                      : "text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}

            <button
              onClick={logout}
              className="mt-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-neutral-500 transition hover:bg-red-500/5 hover:text-red-600 dark:text-neutral-400"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Logout
            </button>
          </nav>

          {/* Bottom promo */}
          <div className="mt-4 rounded-2xl border border-violet-500/10 bg-violet-500/[0.06] p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
              <Shield className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">You&apos;re all set!</span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Your content is secure and ready to stream.
            </p>
            <button className="mt-2.5 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-300">
              <span className="flex items-center gap-1">
                <Crown className="h-3.5 w-3.5" /> LumenStream Pro
              </span>
              <span>→</span>
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/[0.04] bg-[#F7F8FC]/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/80 md:px-8">
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                placeholder="Search for videos, titles, or anything..."
                className="w-full rounded-full border border-black/5 bg-white py-2.5 pl-10 pr-12 text-sm outline-none ring-violet-500/20 focus:ring-2 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:bg-white/10">
                ⌘K
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="rounded-full p-2 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
                <Bell className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full p-2 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white py-1 pl-1 pr-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-bold text-white">
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold leading-tight text-neutral-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-neutral-400">Free Plan</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
