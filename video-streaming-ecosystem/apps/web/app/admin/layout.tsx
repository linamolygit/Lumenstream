"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, PlusCircle, Settings, Film, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminGuard } from "@/components/admin-guard";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/videos", label: "All Videos", icon: Film },
  { href: "/admin/manage-stream-links", label: "Manage Stream Links", icon: Link2 },
  { href: "/admin/scrape", label: "Scrape Videos", icon: PlusCircle },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border hidden md:block">
          <div className="p-6">
            <Link href="/" className="flex items-center gap-2 mb-8">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500" />
              <span className="font-semibold">Admin</span>
            </Link>

            <nav className="space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-10 overflow-auto">{children}</main>
      </div>
    </AdminGuard>
  );
}
