"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CaretLeft as BackIcon,
  FloppyDisk as SaveIcon,
  Trash as DeleteIcon,
  CheckCircle,
  XCircle,
  WarningCircle,
  Play,
  Plus as PlusIcon,
  ArrowsClockwise,
  Check,
  Eye,
  VideoCamera,
  LinkSimple as LinkIcon,
  FilmStrip,
  Sparkle,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { formatDuration, cn } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";

type StreamItem = {
  quality: string;
  url: string;
  type: "hls" | "mp4";
  status: "active" | "disabled";
};

type TestResult = {
  url: string;
  reachable: boolean;
  message: string;
  testing: boolean;
};

export default function AdminEditVideoWorkspace() {
  const params = useParams();
  const videoId = (params?.videoId as string) || (params?.id as string);
  const router = useRouter();
  const { token } = useAuth();

  // Video State
  const [loading, setLoading] = useState(true);
  const [saveStep, setSaveStep] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sourcePageUrl, setSourcePageUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [sourceViews, setSourceViews] = useState("");
  const [lumenViews, setLumenViews] = useState(0);
  const [channelName, setChannelName] = useState("");
  const [channelLogo, setChannelLogo] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [sprite, setSprite] = useState("");
  const [previewVideos, setPreviewVideos] = useState<string[]>([]);
  const [m3u8Streams, setM3u8Streams] = useState<StreamItem[]>([]);
  const [mp4Streams, setMp4Streams] = useState<StreamItem[]>([]);
  const [status, setStatus] = useState<"active" | "hidden" | "dead" | "processing">("active");

  // Stream Test State
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Load Video Data
  useEffect(() => {
    if (!videoId) return;
    (async () => {
      setLoading(true);
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/videos/${videoId}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const v = await res.json();
          setTitle(v.title || "");
          setSlug(v.slug || "");
          setDescription(v.description || "");
          setSourcePageUrl(v.sourcePageUrl || "");
          setDuration(v.duration || 0);
          setSourceViews(v.sourceViews || "");
          setLumenViews(v.views || 0);
          setChannelName(v.channelName || "");
          setChannelLogo(v.channelLogo || "");
          setThumbnail(v.thumbnail || "");
          setSprite(v.sprite || "");
          setStatus(v.status || "active");

          // Previews
          const prevs = Array.isArray(v.previewVideos) ? v.previewVideos : [];
          setPreviewVideos(prevs);

          // m3u8 streams
          const m3u8Raw = Array.isArray(v.m3u8Links) ? v.m3u8Links : [];
          setM3u8Streams(
            m3u8Raw.map((u: any) =>
              typeof u === "string"
                ? { quality: "Auto / Master", url: u, type: "hls", status: "active" }
                : u
            )
          );

          // direct mp4 streams
          const mp4Raw = Array.isArray(v.directVideoLinks) ? v.directVideoLinks : [];
          setMp4Streams(
            mp4Raw.map((u: any) =>
              typeof u === "string"
                ? { quality: "Direct MP4", url: u, type: "mp4", status: "active" }
                : u
            )
          );
        }
      } catch {}
      setLoading(false);
    })();
  }, [videoId, apiBase, token]);

  // Unsaved Changes Warn
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Save Changes Handler
  const handleSave = async () => {
    setSaveStep("Saving metadata...");
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");

      await new Promise((r) => setTimeout(r, 300));
      setSaveStep("Saving media assets...");

      await new Promise((r) => setTimeout(r, 300));
      setSaveStep("Saving stream sources...");

      const payload = {
        title,
        slug,
        description,
        sourcePageUrl,
        duration: Number(duration) || 0,
        sourceViews,
        channelName,
        channelLogo,
        thumbnail,
        sprite,
        previewVideos,
        m3u8Links: m3u8Streams.map((s) => s.url),
        directVideoLinks: mp4Streams.map((s) => s.url),
        status,
      };

      const res = await fetch(`${apiBase}/api/admin/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveStep("✓ Changes saved");
        setIsDirty(false);
        setToastMsg("Video updated successfully.");
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        throw new Error("Save failed");
      }
    } catch {
      setToastMsg("Error saving video changes.");
    } finally {
      setTimeout(() => setSaveStep(null), 1500);
    }
  };

  // Delete Handler
  const handleDeleteVideo = async () => {
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/videos/${videoId}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        router.push("/admin/videos");
      }
    } catch {}
  };

  // Test Stream Endpoint Validator
  const handleTestStream = async (streamUrl: string) => {
    if (!streamUrl) return;
    setTestResults((prev) => ({
      ...prev,
      [streamUrl]: { url: streamUrl, reachable: false, message: "Testing...", testing: true },
    }));

    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/videos/${videoId}/test-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ streamUrl }),
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [streamUrl]: {
          url: streamUrl,
          reachable: data.reachable ?? true,
          message: data.message || "Reachable",
          testing: false,
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [streamUrl]: { url: streamUrl, reachable: false, message: "Unreachable / CORS", testing: false },
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Sticky Header Action Bar */}
      <div className="sticky top-16 z-20 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-black/90 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/admin/videos" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition hover:bg-white hover:text-black">
            <BackIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">Edit Video Asset</h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                  status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                )}
              >
                ● {status}
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400">UUID: {videoId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeleteModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition active:scale-95"
          >
            <DeleteIcon className="h-4 w-4" /> Delete Video
          </button>

          <button
            onClick={handleSave}
            disabled={!!saveStep}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-500 transition active:scale-95 disabled:opacity-60 shadow-lg shadow-violet-600/25"
          >
            {saveStep ? (
              <>
                <ArrowsClockwise className="h-4 w-4 animate-spin" /> {saveStep}
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {toastMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-400">
          <CheckCircle className="h-4 w-4" /> {toastMsg}
        </div>
      )}

      {/* CARD 1: VIDEO INFORMATION */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FilmStrip className="h-5 w-5 text-violet-400" /> Video Information
          </h2>
          <span className="text-[11px] text-neutral-500">Metadata and source page info</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Source Page URL</label>
            <input
              type="url"
              value={sourcePageUrl}
              onChange={(e) => {
                setSourcePageUrl(e.target.value);
                setIsDirty(true);
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Duration (seconds)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-mono text-white outline-none"
                />
                <span className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-mono font-bold text-violet-400">
                  {formatDuration(duration)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Source Views</label>
              <input
                type="text"
                value={sourceViews}
                onChange={(e) => {
                  setSourceViews(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Lumenstream Views (Internal)</label>
              <input
                type="text"
                readOnly
                value={formatViews(lumenViews)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-neutral-400 font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Channel Name</label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => {
                  setChannelName(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Channel Logo Avatar URL</label>
              <input
                type="url"
                value={channelLogo}
                onChange={(e) => {
                  setChannelLogo(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: MEDIA ASSETS */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <VideoCamera className="h-5 w-5 text-indigo-400" /> Media Assets
          </h2>
          <span className="text-[11px] text-neutral-500">Thumbnails, sprite sheets & preview MP4s</span>
        </div>

        {/* Thumbnail Asset */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300">Thumbnail Image</label>
            {thumbnail ? (
              <button onClick={() => setThumbnail("")} className="text-xs font-bold text-red-400 hover:underline">
                [Remove]
              </button>
            ) : (
              <span className="text-[11px] text-neutral-500">No thumbnail URL</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-center">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-900 border border-white/10">
              {thumbnail ? (
                <Image src={thumbnail} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-neutral-600">Empty</div>
              )}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <input
                type="url"
                placeholder="Thumbnail URL..."
                value={thumbnail}
                onChange={(e) => {
                  setThumbnail(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-mono text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sprite Image Asset */}
        <div className="border-t border-white/[0.08] pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300">Sprite Preview Sheet</label>
            <span className={cn("text-[11px] font-bold", sprite ? "text-emerald-400" : "text-amber-400")}>
              {sprite ? "✓ Sprite Available" : "⚠ No Sprite Sheet"}
            </span>
          </div>
          <input
            type="url"
            placeholder="Sprite Image Sheet URL..."
            value={sprite}
            onChange={(e) => {
              setSprite(e.target.value);
              setIsDirty(true);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-mono text-white outline-none"
          />
        </div>

        {/* Preview MP4 Videos */}
        <div className="border-t border-white/[0.08] pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300">Preview MP4 Videos ({previewVideos.length})</label>
            <button
              onClick={() => {
                setPreviewVideos((prev) => [...prev, ""]);
                setIsDirty(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:underline"
            >
              <PlusIcon className="h-3.5 w-3.5" /> [+ Add Preview Video]
            </button>
          </div>

          <div className="space-y-2">
            {previewVideos.map((pv, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder={`Preview MP4 URL #${idx + 1}...`}
                  value={pv}
                  onChange={(e) => {
                    const next = [...previewVideos];
                    next[idx] = e.target.value;
                    setPreviewVideos(next);
                    setIsDirty(true);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-mono text-white outline-none"
                />
                <button
                  onClick={() => {
                    setPreviewVideos((prev) => prev.filter((_, i) => i !== idx));
                    setIsDirty(true);
                  }}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/20"
                >
                  <DeleteIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CARD 3: STREAM SOURCES */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-amber-400" /> Streaming Sources & HLS Playlists
          </h2>
          <span className="text-[11px] text-neutral-500">M3U8 HLS & Direct MP4 stream URL variants</span>
        </div>

        {/* HLS M3U8 Streams Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white">HLS / M3U8 Streams</h3>
            <button
              onClick={() => {
                setM3u8Streams((prev) => [...prev, { quality: "Auto", url: "", type: "hls", status: "active" }]);
                setIsDirty(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:underline"
            >
              <PlusIcon className="h-3.5 w-3.5" /> [+ Add HLS Stream]
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase font-bold text-neutral-400">
                <tr>
                  <th className="p-3">Quality</th>
                  <th className="p-3">M3U8 Stream URL</th>
                  <th className="p-3">Status Validation</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {m3u8Streams.map((s, idx) => {
                  const testRes = testResults[s.url];
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-3">
                        <input
                          type="text"
                          value={s.quality}
                          onChange={(e) => {
                            const next = [...m3u8Streams];
                            next[idx].quality = e.target.value;
                            setM3u8Streams(next);
                            setIsDirty(true);
                          }}
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="url"
                          value={s.url}
                          onChange={(e) => {
                            const next = [...m3u8Streams];
                            next[idx].url = e.target.value;
                            setM3u8Streams(next);
                            setIsDirty(true);
                          }}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-white outline-none"
                        />
                      </td>
                      <td className="p-3">
                        {testRes ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                              testRes.reachable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            )}
                          >
                            {testRes.testing ? "Testing..." : testRes.reachable ? "✓ Reachable" : `✕ ${testRes.message}`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">Not Tested</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleTestStream(s.url)}
                            className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-white hover:text-black transition"
                          >
                            [Test]
                          </button>
                          <button
                            onClick={() => {
                              setM3u8Streams((prev) => prev.filter((_, i) => i !== idx));
                              setIsDirty(true);
                            }}
                            className="rounded p-1 text-red-400 hover:bg-red-500/20"
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Direct MP4 Streams Table */}
        <div className="border-t border-white/[0.08] pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white">Direct MP4 Streams</h3>
            <button
              onClick={() => {
                setMp4Streams((prev) => [...prev, { quality: "720p", url: "", type: "mp4", status: "active" }]);
                setIsDirty(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:underline"
            >
              <PlusIcon className="h-3.5 w-3.5" /> [+ Add MP4 Stream]
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase font-bold text-neutral-400">
                <tr>
                  <th className="p-3">Quality</th>
                  <th className="p-3">MP4 Stream URL</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mp4Streams.map((s, idx) => {
                  const testRes = testResults[s.url];
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-3">
                        <input
                          type="text"
                          value={s.quality}
                          onChange={(e) => {
                            const next = [...mp4Streams];
                            next[idx].quality = e.target.value;
                            setMp4Streams(next);
                            setIsDirty(true);
                          }}
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="url"
                          value={s.url}
                          onChange={(e) => {
                            const next = [...mp4Streams];
                            next[idx].url = e.target.value;
                            setMp4Streams(next);
                            setIsDirty(true);
                          }}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-white outline-none"
                        />
                      </td>
                      <td className="p-3">
                        {testRes ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                              testRes.reachable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            )}
                          >
                            {testRes.testing ? "Testing..." : testRes.reachable ? "✓ Reachable" : `✕ ${testRes.message}`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">Not Tested</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleTestStream(s.url)}
                            className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-white hover:text-black transition"
                          >
                            [Test]
                          </button>
                          <button
                            onClick={() => {
                              setMp4Streams((prev) => prev.filter((_, i) => i !== idx));
                              setIsDirty(true);
                            }}
                            className="rounded p-1 text-red-400 hover:bg-red-500/20"
                          >
                            <DeleteIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Permanently Delete Video Asset?</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-white">"{title}"</span>?
            </p>
            <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1 bg-white/5 p-3 rounded-xl border border-white/10 font-mono">
              <li>Video metadata & records</li>
              <li>Thumbnail & sprite references</li>
              <li>Preview videos & HLS m3u8 streams</li>
            </ul>
            <p className="text-[11px] font-bold text-red-400">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVideo}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 transition active:scale-95 shadow-lg shadow-red-600/25"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
