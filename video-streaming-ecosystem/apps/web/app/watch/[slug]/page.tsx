"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  ListFilter,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Check,
  Download,
  Bookmark,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Send,
  User,
  Sparkles,
} from "lucide-react";
import { YoutubePlayer } from "@/components/watch/youtube-player";
import { formatDuration, cn } from "@/lib/utils";
import { formatViews } from "@/lib/format-views";
import { ShareModal } from "@/components/share-modal";
import { useAuth } from "@/context/auth-context";

type Video = {
  uuid: string;
  title: string;
  slug: string;
  description?: string | null;
  duration: number;
  views: number;
  likesCount?: number;
  sourceViews?: string | null;
  channelName?: string | null;
  channelLogo?: string | null;
  thumbnail?: string | null;
  previewVideos?: string[] | null;
  m3u8Links?: string[] | null;
  status: string;
  createdAt?: string;
};

type CommentItem = {
  id: string;
  body: string;
  authorName: string;
  isGuest: boolean;
  createdAt: string;
};

function timeAgo(date?: string) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${d >= 14 ? "s" : ""} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${d >= 60 ? "s" : ""} ago`;
  return `${Math.floor(d / 365)} year${d >= 730 ? "s" : ""} ago`;
}

function RelatedVideoCard({ v }: { v: Video }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hover, setHover] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const previewSrc = Array.isArray(v.previewVideos) ? v.previewVideos[0] : undefined;

  const onEnter = () => {
    setHover(true);
    const el = videoRef.current;
    if (el && previewSrc) {
      setLoadingPreview(true);
      el.currentTime = 0;
      el.play().catch(() => setLoadingPreview(false));
    }
  };

  const onLeave = () => {
    setHover(false);
    setLoadingPreview(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  return (
    <Link
      href={`/watch/${v.slug}`}
      prefetch={true}
      className="group flex gap-2.5 rounded-xl p-1.5 transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-white/5"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg bg-neutral-900">
        {v.thumbnail && (
          <Image
            src={v.thumbnail}
            alt=""
            fill
            className={`object-cover transition-opacity duration-300 ${
              hover && previewSrc && !loadingPreview ? "opacity-0" : "opacity-100"
            }`}
            sizes="168px"
            unoptimized
          />
        )}
        {previewSrc && (
          <video
            ref={videoRef}
            src={previewSrc}
            muted
            loop
            playsInline
            preload="metadata"
            onPlaying={() => setLoadingPreview(false)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              hover && !loadingPreview ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {hover && loadingPreview && previewSrc && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
          {formatDuration(v.duration || 0)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-neutral-900 group-hover:text-violet-600 dark:text-neutral-100 dark:group-hover:text-violet-400">
          {v.title}
        </p>
        <p className="mt-1 truncate text-[11px] text-neutral-500">{v.channelName || "Unknown"}</p>
        <p className="text-[11px] text-neutral-500">
          {formatViews(v.sourceViews || v.views, "views")}
        </p>
      </div>
    </Link>
  );
}

export default function WatchPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, token } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [descOpen, setDescOpen] = useState(false);

  // Real-time interactivity states
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const workerBase = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8787";

  // Load video detail, likes, views, comments
  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/api/videos/slug/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Video not found" : "Failed to load video");
        const data: Video = await res.json();
        if (!isMounted) return;

        setVideo(data);
        setLikesCount(data.likesCount || 0);
        setViewsCount(data.views || 0);

        // Record real view increment
        fetch(`${apiBase}/api/videos/${data.uuid}/view`, { method: "POST" })
          .then((r) => r.json())
          .then((vData) => {
            if (vData.views && isMounted) setViewsCount(vData.views);
          })
          .catch(() => {});

        // Fetch related videos
        fetch(`${apiBase}/api/videos?limit=16&sort=trending`)
          .then((r) => r.json())
          .then((j) => {
            if (isMounted) {
              setRelated((j.data || []).filter((v: Video) => v.uuid !== data.uuid).slice(0, 12));
            }
          })
          .catch(() => {});

        // Fetch comments
        fetch(`${apiBase}/api/user/comments/${data.uuid}`)
          .then((r) => r.json())
          .then((cData) => {
            if (isMounted) setComments(cData.items || []);
          })
          .catch(() => {});

        // Check user like and save status if authenticated
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        if (authToken) {
          fetch(`${apiBase}/api/user/like-status/${data.uuid}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
            .then((r) => r.json())
            .then((l) => isMounted && setLiked(l.liked))
            .catch(() => {});

          fetch(`${apiBase}/api/user/save-status/${data.uuid}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
            .then((r) => r.json())
            .then((s) => isMounted && setSaved(s.saved))
            .catch(() => {});
        }
      } catch (e: any) {
        if (isMounted) setError(e.message || "Error loading video");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [slug, apiBase, token]);

  // Secure stream URL (via Media Proxy worker)
  const streamUrl = useMemo(() => {
    if (!video?.uuid) return "";
    return `${workerBase}/api/media?uuid=${video.uuid}`;
  }, [video?.uuid, workerBase]);

  // Handle Like Toggle
  const handleLike = async () => {
    if (!video) return;
    const newLiked = !liked;
    setLiked(newLiked);
    if (disliked) setDisliked(false);
    setLikesCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
    if (authToken) {
      try {
        await fetch(`${apiBase}/api/user/like/${video.uuid}`, {
          method: newLiked ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {}
    }
  };

  // Handle Save Toggle
  const handleSave = async () => {
    if (!video) return;
    const newSaved = !saved;
    setSaved(newSaved);

    const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
    if (authToken) {
      try {
        await fetch(`${apiBase}/api/user/save/${video.uuid}`, {
          method: newSaved ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {}
    }
  };

  // Handle Secure Download
  const handleDownload = async () => {
    if (!video) return;
    setDownloading(true);
    try {
      // Record download in localStorage
      const existing = JSON.parse(localStorage.getItem("lumenstream_downloads") || "[]");
      const updated = [
        {
          uuid: video.uuid,
          title: video.title,
          slug: video.slug,
          thumbnail: video.thumbnail,
          duration: video.duration,
          channelName: video.channelName,
          downloadedAt: new Date().toISOString(),
          url: streamUrl,
        },
        ...existing.filter((item: any) => item.uuid !== video.uuid),
      ];
      localStorage.setItem("lumenstream_downloads", JSON.stringify(updated));

      // Trigger download via Blob URL for max stream security
      const res = await fetch(streamUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${video.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open stream URL in new tab safely
      window.open(streamUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  // Handle Comment Submission
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !video) return;
    setSubmittingComment(true);

    const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
    try {
      const res = await fetch(`${apiBase}/api/user/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          uuid: video.uuid,
          body: commentText.trim(),
          guestName: user ? undefined : guestName.trim() || "Anonymous",
        }),
      });

      if (res.ok) {
        const newC: any = await res.json();
        setComments((prev) => [
          {
            id: newC.id,
            body: newC.body,
            authorName: user?.name || newC.guestName || guestName.trim() || "Anonymous",
            isGuest: !user,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setCommentText("");
      }
    } catch {}
    setSubmittingComment(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-4 pt-6 md:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_402px]">
          <div className="aspect-video animate-pulse rounded-2xl bg-white/[0.04]" />
          <div className="hidden space-y-3 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="h-[94px] w-[168px] animate-pulse rounded-xl bg-white/[0.04]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.03]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-3 text-lg font-semibold">{error || "Video not found"}</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const inactive = video.status === "dead";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-[1800px] px-3 pb-16 pt-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_402px] lg:gap-6">
          {/* LEFT COLUMN: Player & Controls */}
          <div className="min-w-0">
            {/* Player Container */}
            <div className="relative overflow-hidden rounded-2xl bg-black border border-white/[0.06] shadow-2xl">
              {(inactive || streamError) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
                    <p className="mt-2 font-semibold text-white">Stream unavailable</p>
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setPlayerKey((k) => k + 1);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95"
                    >
                      <RefreshCw className="h-4 w-4" /> Retry Stream
                    </button>
                  </div>
                </div>
              )}
              {!inactive && streamUrl && (
                <YoutubePlayer
                  key={playerKey}
                  src={streamUrl}
                  poster={video.thumbnail}
                  title={video.title}
                  onError={() => setStreamError(true)}
                />
              )}
            </div>

            {/* Video Title */}
            <h1 className="mt-4 text-lg font-bold leading-snug text-white sm:text-xl md:text-2xl">
              {video.title}
            </h1>

            {/* Channel Info & Actions Bar */}
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
              {/* Channel Info */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-violet-900/40 ring-2 ring-violet-500/20">
                  {video.channelLogo ? (
                    <Image src={video.channelLogo} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-violet-300">
                      {(video.channelName || "U")[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                    {video.channelName || "Unknown Channel"}
                    <BadgeCheck className="h-4 w-4 text-violet-400" />
                  </p>
                  <p className="text-[11px] text-neutral-500">Verified Creator</p>
                </div>
                <button
                  onClick={() => setSubscribed((s) => !s)}
                  className={`ml-2 shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95 shadow-md ${
                    subscribed
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-white text-black hover:bg-neutral-200 hover:scale-105"
                  }`}
                >
                  {subscribed ? "✓ Subscribed" : "Subscribe"}
                </button>
              </div>

              {/* Action Buttons (High Premium Hover & Active White Fill) */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Segmented Like / Dislike */}
                <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/[0.06] p-0.5 shadow-sm">
                  {/* Like Button */}
                  <button
                    onClick={handleLike}
                    className={`group flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                      liked
                        ? "bg-white text-black shadow-lg shadow-white/10"
                        : "text-neutral-300 hover:bg-white hover:text-black dark:hover:bg-white dark:hover:text-black"
                    }`}
                  >
                    <ThumbsUp className={`h-4 w-4 transition-transform group-hover:scale-110 ${liked ? "fill-black text-black" : ""}`} />
                    <span>{formatViews(likesCount)}</span>
                  </button>

                  <div className="w-px self-stretch bg-white/10 my-1" />

                  {/* Dislike Button (Flipped Thumbs Up for Dislike) */}
                  <button
                    onClick={() => {
                      setDisliked((d) => !d);
                      if (liked) setLiked(false);
                    }}
                    className={`group flex items-center px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                      disliked
                        ? "bg-white text-black"
                        : "text-neutral-300 hover:bg-white hover:text-black dark:hover:bg-white dark:hover:text-black"
                    }`}
                    title="Dislike"
                  >
                    <ThumbsDown className={`h-4 w-4 transition-transform group-hover:scale-110 ${disliked ? "fill-black text-black" : ""}`} />
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-300 transition-all duration-200 hover:bg-white hover:text-black active:scale-95 shadow-sm"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm ${
                    saved
                      ? "bg-white text-black"
                      : "bg-white/[0.06] text-neutral-300 hover:bg-white hover:text-black"
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${saved ? "fill-black" : ""}`} />
                  <span>{saved ? "Saved" : "Save"}</span>
                </button>

                {/* Secure Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-300 transition-all duration-200 hover:bg-white hover:text-black active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>{downloading ? "Preparing..." : "Download"}</span>
                </button>
              </div>
            </div>

            {/* Expandable Description Box */}
            <div
              onClick={() => setDescOpen((o) => !o)}
              className="mt-4 cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-3 text-xs font-bold text-neutral-300">
                <span className="text-violet-400 font-semibold">{formatViews(viewsCount, "views")}</span>
                <span>•</span>
                <span>{video.createdAt ? timeAgo(video.createdAt) : "Recently added"}</span>
              </div>
              <p className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-400 ${!descOpen && "line-clamp-2"}`}>
                {video.description || "No description provided for this video."}
              </p>
              <button className="mt-2 text-xs font-semibold text-violet-400 hover:underline">
                {descOpen ? "Show less" : "...more"}
              </button>
            </div>

            {/* Comments Section */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Comments <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs text-violet-300">{comments.length}</span>
                </h2>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                    {user?.name ? user.name[0].toUpperCase() : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {!user && (
                      <input
                        type="text"
                        placeholder="Your name (optional for guest)..."
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/40"
                      />
                    )}
                    <textarea
                      rows={2}
                      placeholder="Add a public comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.04] p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-violet-500/40"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition active:scale-95 disabled:opacity-50"
                  >
                    {submittingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Comment
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                      {c.authorName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-200">{c.authorName}</span>
                        {c.isGuest && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500">Guest</span>
                        )}
                        <span className="text-[10px] text-neutral-600">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-300 leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="py-6 text-center text-xs text-neutral-500">Be the first to comment on this video!</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Related Videos with Hover Preview */}
          <aside className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-violet-400" /> Up Next
            </div>
            <div className="space-y-2">
              {related.map((v) => (
                <RelatedVideoCard key={v.uuid} v={v} />
              ))}
              {related.length === 0 && (
                <p className="py-8 text-center text-xs text-neutral-500">No related videos</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Share Modal */}
      {video && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          title={video.title}
          url={typeof window !== "undefined" ? window.location.href : ""}
        />
      )}
    </div>
  );
}
