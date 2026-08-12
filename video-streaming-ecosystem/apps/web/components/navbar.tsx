"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/auth-context";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass mt-3 rounded-2xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <span className="font-semibold text-lg tracking-tight">MediaHoster</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition">Home</Link>
            {user && (
              <Link
                href={user.role === "admin" ? "/admin" : "/dashboard"}
                className="hover:text-foreground transition text-primary font-medium"
              >
                Dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/search" className="p-2 rounded-xl hover:bg-accent transition" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl hover:bg-accent transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <Link
                href="/profile"
                className="p-2 rounded-xl hover:bg-accent transition"
                title={user.name || user.email}
              >
                <User className="h-5 w-5 text-primary" />
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
