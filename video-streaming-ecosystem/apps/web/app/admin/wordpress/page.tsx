"use client";

import { useState } from "react";
import { GlobeHemisphereWest as WordpressIcon, CheckCircle, ArrowsClockwise, Key } from "@phosphor-icons/react";

export default function AdminWordpressPage() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("2 minutes ago");

  const handleSyncNow = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync("Just now");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">WordPress Integration Portal</h1>
        <p className="mt-1 text-xs text-neutral-400">Sync status for advanced-media-sync WordPress plugin.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 space-y-6 max-w-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <WordpressIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">advanced-media-sync Plugin</h3>
              <p className="text-xs text-neutral-400">Version 1.0.0 (Active)</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle className="h-4 w-4" /> Connected
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-neutral-500 font-medium">Last Synchronized</p>
            <p className="mt-1 font-bold text-white text-sm">{lastSync}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-neutral-500 font-medium">Player Embedding</p>
            <p className="mt-1 font-bold text-emerald-400 text-sm">Responsive Iframe Ready</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-600/25"
          >
            <ArrowsClockwise className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
