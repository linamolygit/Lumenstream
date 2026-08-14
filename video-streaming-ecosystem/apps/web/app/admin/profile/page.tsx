"use client";

import { useAuth } from "@/context/auth-context";
import { UserCircle, ShieldCheck, Key, SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/sign-in");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Admin Profile & Credentials</h1>
        <p className="mt-1 text-xs text-neutral-400">Super Administrator account security settings.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-xl font-bold text-white ring-4 ring-violet-500/20">
            {(user?.name || "R")[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user?.name || "Rishav Srivastawa"}</h2>
            <p className="text-xs text-neutral-400">{user?.email || "admin@lumenstream.com"}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-400 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
            </span>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-300">Admin Username</label>
            <input
              type="text"
              readOnly
              value={user?.name || "Rishav9801"}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-neutral-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300">Admin Email</label>
            <input
              type="text"
              readOnly
              value={user?.email || "admin@lumenstream.com"}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-neutral-400 outline-none"
            />
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-600/90 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500 transition active:scale-95 shadow-lg shadow-red-600/25"
          >
            <SignOut className="h-4 w-4" /> Logout Admin Session
          </button>
        </div>
      </div>
    </div>
  );
}
