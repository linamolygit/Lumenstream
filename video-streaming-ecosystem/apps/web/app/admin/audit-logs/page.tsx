"use client";

import { useEffect, useState } from "react";
import { LockKey as AuditIcon, ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";

type AuditLog = {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: string;
};

export default function AdminAuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/admin/audit-logs`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch {}
    })();
  }, [apiBase, token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Admin Security Audit Logs</h1>
        <p className="mt-1 text-xs text-neutral-400">Security history recording critical administrative system actions.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase font-bold text-neutral-400">
            <tr>
              <th className="p-4">Action</th>
              <th className="p-4">Details</th>
              <th className="p-4">Admin User</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition">
                <td className="p-4 font-bold text-violet-400">{log.action}</td>
                <td className="p-4 text-neutral-300">{log.details}</td>
                <td className="p-4">
                  <span className="font-semibold text-white">{log.performedBy}</span>
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
