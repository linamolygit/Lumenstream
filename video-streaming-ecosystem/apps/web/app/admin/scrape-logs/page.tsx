"use client";

import { useEffect, useState } from "react";
import { ClipboardText as LogIcon, CheckCircle, Clock } from "@phosphor-icons/react";

type ScrapeLog = {
  id: string;
  sourceUrl: string;
  videosFound: number;
  status: string;
  timestamp: string;
};

export default function AdminScrapeLogsPage() {
  const [logs] = useState<ScrapeLog[]>([
    {
      id: "job-101",
      sourceUrl: "https://xhamster.com/categories/trending",
      videosFound: 30,
      status: "completed",
      timestamp: new Date().toISOString(),
    },
    {
      id: "job-100",
      sourceUrl: "https://xhamster.com/videos/popular",
      videosFound: 15,
      status: "completed",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Scrape System Logs</h1>
        <p className="mt-1 text-xs text-neutral-400">Audit execution logs for automatic and batch scrape jobs.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase font-bold text-neutral-400">
            <tr>
              <th className="p-4">Job ID</th>
              <th className="p-4">Source Target URL</th>
              <th className="p-4">Videos Extracted</th>
              <th className="p-4">Status</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition">
                <td className="p-4 font-mono font-bold text-violet-400">{log.id}</td>
                <td className="p-4 font-mono text-neutral-300 max-w-sm truncate">{log.sourceUrl}</td>
                <td className="p-4 font-bold text-white">{log.videosFound} videos</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" /> {log.status}
                  </span>
                </td>
                <td className="p-4 text-neutral-500">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
