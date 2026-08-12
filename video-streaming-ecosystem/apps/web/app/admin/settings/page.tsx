"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Settings as SettingsIcon,
  Shield,
  Mail,
  Cloud,
  Radio,
  SlidersHorizontal,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Palette,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type Tab = "general" | "security" | "email" | "storage" | "stream" | "advanced";

type SiteSettings = {
  siteName: string;
  siteTagline: string;
  adminEmail: string;
  language: string;
  timezone: string;
  itemsPerPage: number;
  primaryColor: string;
  sidebarStyle: string;
  maintenanceMode: boolean;
};

const DEFAULTS: SiteSettings = {
  siteName: "LumenStream",
  siteTagline: "Stream. Share. Grow.",
  adminEmail: "",
  language: "en-US",
  timezone: "Asia/Kolkata",
  itemsPerPage: 20,
  primaryColor: "#8B5CF6",
  sidebarStyle: "default",
  maintenanceMode: false,
};

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "security", label: "Security", icon: Shield },
  { id: "email", label: "Email", icon: Mail },
  { id: "storage", label: "Storage", icon: Cloud },
  { id: "stream", label: "Stream", icon: Radio },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
];

export default function AdminSettingsPage() {
  const { user, token } = useAuth();
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = useState<Tab>("general");
  const [form, setForm] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lumenstream_admin_settings");
      if (raw) {
        setForm({ ...DEFAULTS, ...JSON.parse(raw), adminEmail: user?.email || DEFAULTS.adminEmail });
      } else {
        setForm((f) => ({ ...f, adminEmail: user?.email || "" }));
      }
    } catch {
      setForm((f) => ({ ...f, adminEmail: user?.email || "" }));
    }
  }, [user?.email]);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      localStorage.setItem("lumenstream_admin_settings", JSON.stringify(form));

      // Optional backend persist
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/settings`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }).catch(() => null);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500 dark:text-neutral-400">
          Manage your platform settings and preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-black/[0.04] dark:border-white/10">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
              tab === id
                ? "border-violet-600 text-violet-700 dark:text-violet-300"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {tab === "general" && (
            <motion.form
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSave}
              className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-6"
            >
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                    General Settings
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Configure basic platform information and preferences.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Site Name">
                  <input
                    value={form.siteName}
                    onChange={(e) => update("siteName", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Site Tagline">
                  <input
                    value={form.siteTagline}
                    onChange={(e) => update("siteTagline", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Admin Email">
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => update("adminEmail", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <p className="mt-1.5 text-xs text-neutral-400">
                  This email will be used for important notifications.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Default Language">
                  <select
                    value={form.language}
                    onChange={(e) => update("language", e.target.value)}
                    className={inputCls}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-IN">English (IN)</option>
                    <option value="hi-IN">Hindi (IN)</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select
                    value={form.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                    className={inputCls}
                  >
                    <option value="Asia/Kolkata">(UTC+05:30) Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">(UTC-05:00) New York</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4 max-w-xs">
                <Field label="Items Per Page">
                  <select
                    value={form.itemsPerPage}
                    onChange={(e) => update("itemsPerPage", Number(e.target.value))}
                    className={inputCls}
                  >
                    {[10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="mt-1.5 text-xs text-neutral-400">
                  Number of items to display in tables.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </button>

                <AnimatePresence>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Changes saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.form>
          )}

          {tab !== "general" && (
            <div className="rounded-[20px] border border-black/[0.04] bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {tabs.find((t) => t.id === tab)?.label} settings
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Coming soon — wire SMTP, secrets, and stream worker config here.
              </p>
            </div>
          )}

          {/* Maintenance */}
          <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Maintenance Mode
                  </h3>
                  <p className="text-sm text-neutral-400">
                    Put your site in maintenance mode while you make updates.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => update("maintenanceMode", !form.maintenanceMode)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition",
                  form.maintenanceMode ? "bg-violet-600" : "bg-neutral-200 dark:bg-white/15"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                    form.maintenanceMode ? "left-5" : "left-0.5"
                  )}
                />
              </button>
            </div>

            {form.maintenanceMode && (
              <div className="mt-4 flex gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                When enabled, only administrators will be able to access the platform.
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Appearance */}
          <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Platform Appearance
                </h3>
                <p className="text-xs text-neutral-400">
                  Customize the look and feel of your admin panel.
                </p>
              </div>
            </div>

            <Field label="Primary Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-xl border border-black/5 bg-transparent p-1 dark:border-white/10"
                />
                <input
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className={inputCls}
                />
              </div>
            </Field>

            <div className="mt-3">
              <Field label="Theme Mode">
                <select
                  value={theme || "system"}
                  onChange={(e) => setTheme(e.target.value)}
                  className={inputCls}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Sidebar Style">
                <select
                  value={form.sidebarStyle}
                  onChange={(e) => update("sidebarStyle", e.target.value)}
                  className={inputCls}
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="minimal">Minimal</option>
                </select>
              </Field>
            </div>

            {/* Live preview */}
            <div className="mt-4 rounded-2xl border border-black/5 bg-[#F7F8FC] p-3 dark:border-white/10 dark:bg-black/20">
              <p className="mb-2 text-[11px] font-medium text-neutral-400">Live Preview</p>
              <div className="flex gap-2">
                <div
                  className="h-16 w-10 rounded-lg"
                  style={{ backgroundColor: form.primaryColor }}
                />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-3/4 rounded bg-neutral-200 dark:bg-white/10" />
                  <div className="h-2.5 w-1/2 rounded bg-neutral-200 dark:bg-white/10" />
                  <div className="h-8 rounded-lg bg-white dark:bg-zinc-800" />
                </div>
              </div>
            </div>
          </div>

          {/* System info */}
          <div className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-[#A78BFA]">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  System Information
                </h3>
                <p className="text-xs text-neutral-400">Your platform system details.</p>
              </div>
            </div>

            <dl className="space-y-3 text-sm">
              <Row label="Version" value="v2.1.0" />
              <Row
                label="Environment"
                value={
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Production
                  </span>
                }
              />
              <Row label="Worker URL" value={process.env.NEXT_PUBLIC_WORKER_URL || "—"} />
              <Row label="API URL" value={process.env.NEXT_PUBLIC_API_URL || "—"} />
              <Row
                label="Server Time"
                value={new Date().toLocaleString("en-IN", { timeZone: form.timezone })}
              />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-black/5 bg-[#F7F8FC] px-3.5 py-2.5 text-sm outline-none ring-violet-500/20 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] pb-2 last:border-0 dark:border-white/5">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="truncate text-right text-neutral-800 dark:text-neutral-200">{value}</dd>
    </div>
  );
}
