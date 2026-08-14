"use client";

import { useState } from "react";
import { Settings, Monitor, Volume2, Shield, Bell, ChevronRight } from "lucide-react";

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}

function Toggle({ value, onChange, label, desc }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        {desc && <p className="text-xs text-neutral-500">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
          value ? "bg-violet-600" : "bg-neutral-700"
        }`}
        aria-checked={value}
        role="switch"
      >
        <span
          className={`absolute h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-1"
          }`}
          style={{ width: "18px", height: "18px" }}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  // Playback settings
  const [autoplay, setAutoplay] = useState(() => {
    try { return localStorage.getItem("ls_autoplay") !== "false"; } catch { return true; }
  });
  const [defaultQuality, setDefaultQuality] = useState(() => {
    try { return localStorage.getItem("ls_quality") || "auto"; } catch { return "auto"; }
  });

  // Privacy
  const [trackHistory, setTrackHistory] = useState(() => {
    try { return localStorage.getItem("ls_track_history") !== "false"; } catch { return true; }
  });

  // Notifications
  const [notifBrowser, setNotifBrowser] = useState(false);

  const save = (key: string, value: string | boolean) => {
    try { localStorage.setItem(key, String(value)); } catch {}
  };

  const sections = [
    {
      icon: Monitor,
      label: "Playback",
      content: (
        <div className="divide-y divide-white/[0.04]">
          <Toggle
            value={autoplay}
            onChange={v => { setAutoplay(v); save("ls_autoplay", v); }}
            label="Autoplay Next Video"
            desc="Automatically play the next video when current one ends"
          />
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-200">Default Quality</p>
              <p className="text-xs text-neutral-500">Preferred video quality when available</p>
            </div>
            <select
              value={defaultQuality}
              onChange={e => { setDefaultQuality(e.target.value); save("ls_quality", e.target.value); }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-xs text-neutral-300 outline-none focus:border-violet-500/40 transition"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      icon: Shield,
      label: "Privacy",
      content: (
        <div className="divide-y divide-white/[0.04]">
          <Toggle
            value={trackHistory}
            onChange={v => { setTrackHistory(v); save("ls_track_history", v); }}
            label="Track Watch History"
            desc="Save your watch progress and history to your account"
          />
        </div>
      ),
    },
    {
      icon: Bell,
      label: "Notifications",
      content: (
        <div className="divide-y divide-white/[0.04]">
          <Toggle
            value={notifBrowser}
            onChange={v => {
              setNotifBrowser(v);
              if (v && typeof window !== "undefined" && "Notification" in window) {
                Notification.requestPermission();
              }
            }}
            label="Browser Notifications"
            desc="Receive notifications in your browser"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-full p-4 md:p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-2.5">
        <Settings className="h-5 w-5 text-violet-400" />
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </div>

      <div className="space-y-4">
        {sections.map(sec => {
          const Icon = sec.icon;
          return (
            <div key={sec.label} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <div className="flex items-center gap-2.5 border-b border-white/[0.04] px-5 py-3.5">
                <Icon className="h-4 w-4 text-violet-400" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-neutral-200">{sec.label}</span>
              </div>
              <div className="px-5">{sec.content}</div>
            </div>
          );
        })}

        {/* App Info */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <div className="px-5 py-4">
            <p className="text-xs text-neutral-600">LumenStream v2.0 · Not affiliated with any external sites</p>
            <p className="mt-0.5 text-xs text-neutral-700">
              Disclaimer: We do not host any content on our servers. This service serves solely as a stream to play publicly shared links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
