"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function OldDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/sign-in");
      } else if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/user/dashboard");
      }
    }
  }, [loading, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-violet-500" />
        </div>
        <p className="text-sm text-neutral-500">Redirecting...</p>
      </div>
    </div>
  );
}
