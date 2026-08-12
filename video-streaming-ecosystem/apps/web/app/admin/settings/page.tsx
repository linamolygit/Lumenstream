"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage platform settings</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Site Settings */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="font-semibold">Site Settings</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">Site Name</label>
            <Input defaultValue="MediaHoster Pro" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Worker Base URL</label>
            <Input defaultValue={process.env.NEXT_PUBLIC_WORKER_URL || ""} placeholder="https://media.yourdomain.com" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default Videos per Page</label>
            <Input type="number" defaultValue={24} />
          </div>
        </div>

        {/* Account */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="font-semibold">Account</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input defaultValue={user?.name || ""} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input defaultValue={user?.email || ""} disabled />
          </div>
        </div>

        <Button type="submit">
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
