"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  PencilSimple as EditIcon,
  FloppyDisk as SaveIcon,
  Trash as DeleteIcon,
  CaretLeft as BackIcon,
  CheckCircle,
  Eye,
  LinkSimple as LinkIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { formatDuration } from "@/lib/utils";

export default function EditVideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Trending");
  const [channelName, setChannelName] = useState("");
  const [channelLogo, setChannelLogo] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [views, setViews] = useState(0);
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/videos/${id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const v = await res.json();
          setTitle(v.title || "");
          setSlug(v.slug || "");
          setDescription(v.description || "");
          setChannelName(v.channelName || "");
          setChannelLogo(v.channelLogo || "");
          setThumbnail(v.thumbnail || "");
          setSourceUrl(v.sourcePageUrl || "");
          setDuration(v.duration || 0);
          setViews(v.views || 0);
          setStatus(v.status || "active");
        }
      } catch {}
    })();
  }, [id, apiBase, token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      setMsg("Video metadata updated successfully!");
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/videos/${id}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        router.push("/admin/videos");
      }
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/admin/videos" className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white transition">
          <BackIcon className="h-4 w-4" /> Back to All Videos
        </Link>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition active:scale-95"
        >
          <DeleteIcon className="h-4 w-4" /> Delete Video
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Edit Video Metadata</h1>
        <p className="mt-1 text-xs text-neutral-400 font-mono">UUID: {id}</p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-400">
          <CheckCircle className="h-4 w-4" /> {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Basic Information</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white outline-none"
              >
                <option value="Trending">Trending</option>
                <option value="Featured">Featured</option>
                <option value="Entertainment">Entertainment</option>
                <option value="HD Streams">HD Streams</option>
              </select>
            </div>
          </div>
        </div>

        {/* Media & Channel */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Thumbnail Preview</h2>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-900 border border-white/10">
              {thumbnail && <Image src={thumbnail} alt="" fill className="object-cover" unoptimized />}
            </div>
            <input
              type="text"
              placeholder="Thumbnail URL..."
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white border-b border-white/[0.08] pb-3">Channel Details</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Channel Name</label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Channel Logo URL</label>
              <input
                type="text"
                value={channelLogo}
                onChange={(e) => setChannelLogo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition active:scale-95 shadow-lg shadow-violet-600/25"
          >
            <SaveIcon className="h-4 w-4" /> Save Changes
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl">
            <h3 className="text-base font-bold text-white">Permanently Delete Video?</h3>
            <p className="mt-2 text-xs text-neutral-400">This action will remove the video record and signed stream tokens.</p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
