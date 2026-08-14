"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useUserApi } from "@/lib/use-user-api";
import {
  UserCircle,
  PencilSimple as Edit2,
  FloppyDisk as Save,
  X,
  Trash as Trash2,
  ArrowsClockwise as RefreshCw,
} from "@phosphor-icons/react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { get, patch, del } = useUserApi();
  const [stats, setStats] = useState({ likes: 0, saves: 0, history: 0, comments: 0 });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingData, setDeletingData] = useState(false);

  useEffect(() => {
    get("/api/user/me").then(d => {
      setStats(d.stats || { likes: 0, saves: 0, history: 0, comments: 0 });
      setName(d.name || "");
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await patch("/api/user/profile", { name });
      setEditing(false);
      // Update localStorage
      try {
        const u = JSON.parse(localStorage.getItem("lumenstream_user") || "{}");
        u.name = name;
        localStorage.setItem("lumenstream_user", JSON.stringify(u));
      } catch {}
    } catch (e: any) {
      setSaveError(e.message);
    }
    setSaving(false);
  };

  const deleteAllData = async () => {
    if (!confirm("This will permanently delete your likes, saves, watch history, and comments. This cannot be undone. Proceed?")) return;
    setDeletingData(true);
    try {
      await del("/api/user/my-data");
      alert("All your data has been deleted.");
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setDeletingData(false);
  };

  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const statCards = [
    { label: "Liked", value: stats.likes, color: "text-red-400 bg-red-500/10" },
    { label: "Saved", value: stats.saves, color: "text-blue-400 bg-blue-500/10" },
    { label: "Watched", value: stats.history, color: "text-green-400 bg-green-500/10" },
    { label: "Comments", value: stats.comments, color: "text-amber-400 bg-amber-500/10" },
  ];

  return (
    <div className="min-h-full p-4 md:p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-2.5">
        <UserCircle className="h-5 w-5 text-violet-400" />
        <h1 className="text-lg font-bold text-white">My Profile</h1>
      </div>

      {/* Avatar + Name */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-violet-500/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="rounded-xl border border-violet-500/30 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/60 transition w-48"
                  autoFocus
                />
                <button
                  onClick={saveProfile}
                  disabled={saving || !name.trim()}
                  className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50 active:scale-95"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => { setEditing(false); setName(user?.name || ""); setSaveError(null); }}
                  className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{user?.name}</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-white/5 hover:text-violet-400 transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {saveError && <p className="mt-1 text-xs text-red-400">{saveError}</p>}
            <p className="text-sm text-neutral-500">{user?.email}</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
              {user?.role || "user"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(s => (
            <div key={s.label} className={`rounded-xl p-3 ${s.color.split(" ")[1]}`}>
              <p className={`text-xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
              <p className="text-xs text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5">
        <h3 className="mb-1 text-sm font-bold text-red-400">Danger Zone</h3>
        <p className="mb-4 text-xs text-neutral-500">
          These actions are permanent and cannot be undone.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={deleteAllData}
            disabled={deletingData}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {deletingData ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete All My Data
          </button>
          <button
            onClick={() => { if (confirm("Are you sure you want to logout?")) logout(); }}
            className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
