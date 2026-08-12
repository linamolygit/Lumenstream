"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Moon, Sun, User } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const links = [
    { href: "/", label: "Home" },
    { href: "/categories", label: "Categories" },
    { href: "/trending", label: "Trending" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              L
            </div>
            <span className="text-[15px] font-semibold tracking-tight">LumenStream</span>
          </Link>

          {/* Center nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition",
                    active
                      ? "bg-violet-100 font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const q = new FormData(form).get("q") as string;
                if (q?.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
                } else {
                  window.location.href = "/search";
                }
              }}
              className="relative hidden sm:block"
            >
              <input
                name="q"
                type="text"
                placeholder="Search..."
                className="w-36 rounded-full border border-black/5 bg-neutral-100 py-1.5 pl-8 pr-3 text-xs text-neutral-800 outline-none focus:w-48 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/10 dark:text-white transition-all"
              />
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </form>

            <Link
              href="/search"
              className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10 sm:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Link>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user ? (
              <Link
                href={user.role === "admin" ? "/admin" : "/dashboard"}
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition shadow-sm"
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition shadow-sm"
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
