"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Film,
  Link2,
  Download,
  BarChart3,
  Settings,
  Search,
  Bell,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/videos", label: "All Videos", icon: Film },
  { href: "/admin/manage-stream-links", label: "Manage Stream Links", icon: Link2 },
  { href: "/admin/scrape", label: "Scrape", icon: Download },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/sign-in");
      else if (user.role !== "admin") router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const initials = (user.name || "A")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-black">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-black/[0.04] bg-white/80 px-3 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 md:flex">
          <Link href="/admin" className="mb-7 flex items-center gap-2.5 px-2">
            <Image
              src="/logo-dark.png"
              alt="LumenStream Admin"
              width={150}
              height={38}
              priority
              className="hidden dark:block h-8 w-auto object-contain"
            />
            <Image
              src="/logo-light.png"
              alt="LumenStream Admin"
              width={150}
              height={38}
              priority
              className="block dark:hidden h-8 w-auto object-contain"
            />
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
          </nav>

          {/* Admin user pill */}
          <div className="mt-auto flex items-center gap-2 rounded-2xl border border-black/5 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                {user.name}
              </p>
              <p className="text-[10px] text-neutral-400">Super Admin</p>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/[0.04] bg-[#F7F8FC]/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/80 md:px-8">
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                placeholder="Search anything..."
                className="w-full rounded-full border border-black/5 bg-white py-2.5 pl-10 pr-12 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:bg-white/10">
                ⌘K
              </span>
            </div>
            <button className="ml-auto rounded-full p-2 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
              <Bell className="h-4 w-4" />
            </button>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
