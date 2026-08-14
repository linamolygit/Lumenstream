"use client";

import { useEffect, useState } from "react";
import {
  Gear as SettingsIcon,
  VideoCamera as VideoIcon,
  UsersThree as UserIcon,
  ChatText as CommentIcon,
  Sparkle as RecIcon,
  DownloadSimple as DownloadIcon,
  LinkSimple as StreamIcon,
  ShieldCheck as SecurityIcon,
  FloppyDisk as SaveIcon,
  CheckCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "general"
  | "video"
  | "users"
  | "comments"
  | "recommendations"
  | "downloads"
  | "stream"
  | "security";

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Form State
  const [siteName, setSiteName] = useState("Lumenstream");
  const [siteUrl, setSiteUrl] = useState("https://lumenstream.com");
  const [allowGuestPlayback, setAllowGuestPlayback] = useState(true);
  const [allowGuestLikes, setAllowGuestLikes] = useState(true);
  const [allowGuestComments, setAllowGuestComments] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [guestDownloads, setGuestDownloads] = useState(false);
  const [enableRecs, setEnableRecs] = useState(true);
  const [streamCacheDuration, setStreamCacheDuration] = useState("21600");

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "video", label: "Video", icon: VideoIcon },
    { id: "users", label: "Users", icon: UserIcon },
    { id: "comments", label: "Comments", icon: CommentIcon },
    { id: "recommendations", label: "Recommendations", icon: RecIcon },
    { id: "downloads", label: "Downloads", icon: DownloadIcon },
    { id: "stream", label: "Stream", icon: StreamIcon },
    { id: "security", label: "Security", icon: SecurityIcon },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">System & SaaS Settings</h1>
        <p className="mt-1 text-xs text-neutral-400">Configure global platform rules, permissions, stream parameters, and security matrix.</p>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-400">
          <CheckCircle className="h-4 w-4" /> System settings updated successfully!
        </div>
      )}

      {/* Tabs Horizontal Selector */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.08] pb-3 scrollbar-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as SettingsTab)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition duration-200 shrink-0 active:scale-95",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 space-y-6">
        {activeTab === "general" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">General Platform Settings</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Site Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Public Site URL</label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
        )}

        {activeTab === "video" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Video Playback & Permissions</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowGuestPlayback}
                onChange={(e) => setAllowGuestPlayback(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-white">Allow Guest Playback (Watch without login)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowGuestLikes}
                onChange={(e) => setAllowGuestLikes(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-white">Allow Guest Likes</span>
            </label>
          </div>
        )}

        {activeTab === "downloads" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Download Policy Matrix</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDownloads}
                onChange={(e) => setAllowDownloads(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-white">Enable Video Downloads for Logged-In Users</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer opacity-70">
              <input
                type="checkbox"
                checked={guestDownloads}
                onChange={(e) => setGuestDownloads(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-white">Allow Guest Downloads (Default: OFF / Logged User Only)</span>
            </label>
          </div>
        )}

        {activeTab === "recommendations" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Personalized Recommendation Engine</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableRecs}
                onChange={(e) => setEnableRecs(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-0"
              />
              <span className="text-xs font-semibold text-white">Enable AI Personalized Video Recommendations</span>
            </label>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Security & HMAC Tokens</h3>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-xs text-violet-300">
              <p className="font-bold">Super Admin Credentials Protected</p>
              <p className="mt-1 text-[11px] text-violet-400">Username: Rishav9801 | Role: Super Admin</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-white/[0.08]">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition active:scale-95 shadow-lg shadow-violet-600/25"
          >
            <SaveIcon className="h-4 w-4" /> Save System Settings
          </button>
        </div>
      </form>
    </div>
  );
}
