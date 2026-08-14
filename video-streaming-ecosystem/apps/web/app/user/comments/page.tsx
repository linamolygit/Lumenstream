"use client";

import { useEffect, useState, useCallback } from "react";
import { useUserApi } from "@/lib/use-user-api";
import Link from "next/link";
import {
  ChatText as MessageSquare,
  Trash as Trash2,
  ArrowsClockwise as RefreshCw,
  ArrowSquareOut as ExternalLink,
} from "@phosphor-icons/react";

interface Comment {
  id: string;
  body: string;
  videoUuid: string;
  createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CommentsPage() {
  const { get, del } = useUserApi();
  const [items, setItems] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await get("/api/user/my-comments?limit=100");
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    setDeletingId(id);
    try {
      await del(`/api/user/comment/${id}`);
      setItems(prev => prev.filter(c => c.id !== id));
      setTotal(prev => prev - 1);
    } catch {}
    setDeletingId(null);
  };

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <MessageSquare className="h-5 w-5 text-violet-400" />
        <h1 className="text-lg font-bold text-white">My Comments</h1>
        {total > 0 && (
          <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">{total}</span>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="animate-pulse rounded-xl bg-white/[0.04] p-4">
              <div className="h-3 w-full rounded bg-white/[0.06] mb-2" />
              <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-neutral-500">{error}</p>
          <button onClick={fetchComments} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
            <MessageSquare className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-200">No comments yet</h3>
            <p className="mt-1 text-sm text-neutral-500">Comments you leave on videos will appear here.</p>
          </div>
          <Link href="/" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition active:scale-95">
            Browse Videos
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map(comment => (
            <div key={comment.id} className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 hover:border-violet-500/20 transition-all">
              <p className="text-sm text-neutral-200 leading-relaxed">{comment.body}</p>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="text-[11px] text-neutral-600">{formatDate(comment.createdAt)}</span>
                <span className="text-[11px] text-neutral-700">·</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-neutral-600 truncate max-w-[120px]">
                  {comment.videoUuid}
                </span>
                <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => deleteComment(comment.id)}
                    disabled={deletingId === comment.id}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition active:scale-95 disabled:opacity-50"
                  >
                    {deletingId === comment.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
