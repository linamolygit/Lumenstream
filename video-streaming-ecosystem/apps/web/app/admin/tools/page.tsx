"use client";

import { useState } from "react";
import { Wrench as ToolsIcon, ArrowsClockwise, Broom, Database, Check } from "@phosphor-icons/react";

export default function AdminToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const runTool = (name: string, label: string) => {
    setActiveTool(name);
    setTimeout(() => {
      setActiveTool(null);
      setSuccessMsg(`${label} completed successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 1500);
  };

  const tools = [
    {
      id: "recalc-views",
      title: "Recalculate View Aggregates",
      desc: "Synchronize database views count with real-time stream logs.",
      icon: Database,
    },
    {
      id: "clear-cache",
      title: "Clear Recommendation Cache",
      desc: "Purge cached user recommendation vectors and force algorithm rebuild.",
      icon: Broom,
    },
    {
      id: "repair-meta",
      title: "Repair Missing Metadata",
      desc: "Batch fix missing channel logos and duration badges.",
      icon: ArrowsClockwise,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">System Administrative Tools</h1>
        <p className="mt-1 text-xs text-neutral-400">Database utilities, maintenance scripts, and cache controls.</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-400">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const Icon = t.icon;
          const isRunning = activeTool === t.id;
          return (
            <div key={t.id} className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-black/40 p-5 transition hover:border-white/20">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{t.title}</h3>
                </div>
                <p className="mt-3 text-xs text-neutral-400 leading-relaxed">{t.desc}</p>
              </div>

              <button
                onClick={() => runTool(t.id, t.title)}
                disabled={isRunning}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white hover:text-black transition active:scale-95 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Executing...
                  </>
                ) : (
                  "Run Utility"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
