"use client";

import { useEffect, useState } from "react";
import { UsersThree as UsersIcon, ShieldCheck, UserMinus, Trash, MagnifyingGlass as SearchIcon } from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  watchedCount: number;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/admin/users`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch {}
      setLoading(false);
    })();
  }, [apiBase, token]);

  const filteredUsers = users.filter(
    (u) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Registered Users ({filteredUsers.length})</h1>
          <p className="mt-1 text-xs text-neutral-400">User accounts, roles, and engagement activity analytics.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder="Search user by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-violet-500/50"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase font-bold text-neutral-400">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Joined</th>
              <th className="p-4">Watched</th>
              <th className="p-4">Likes</th>
              <th className="p-4">Comments</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition">
                <td className="p-4">
                  <div>
                    <p className="font-bold text-white">{u.name}</p>
                    <p className="text-[11px] text-neutral-400">{u.email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      u.role === "admin" ? "bg-violet-500/20 text-violet-300" : "bg-neutral-500/20 text-neutral-300"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-neutral-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-4 font-mono font-bold text-white">{u.watchedCount}</td>
                <td className="p-4 font-mono text-neutral-300">{u.likesCount}</td>
                <td className="p-4 font-mono text-neutral-300">{u.commentsCount}</td>
                <td className="p-4 text-right">
                  <button className="rounded-lg p-1.5 text-neutral-400 hover:bg-white hover:text-black transition">
                    <UserMinus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs text-neutral-500">
                  No users found matching search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
