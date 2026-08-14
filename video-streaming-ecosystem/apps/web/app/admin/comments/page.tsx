"use client";

import { useEffect, useState } from "react";
import { ChatText as CommentIcon, Trash as DeleteIcon, Eye as ViewIcon } from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";

type Comment = {
  id: string;
  videoUuid: string;
  videoTitle: string;
  videoSlug?: string;
  authorName: string;
  isGuest: boolean;
  body: string;
  createdAt: string;
};

export default function AdminCommentsPage() {
  const { token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/admin/comments`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch {}
      setLoading(false);
    })();
  }, [apiBase, token]);

  const handleDelete = async (id: string) => {
    try {
      const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/admin/comments/${id}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Comment Moderation ({comments.length})</h1>
        <p className="mt-1 text-xs text-neutral-400">Review guest and user comments across videos.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase font-bold text-neutral-400">
            <tr>
              <th className="p-4">Author</th>
              <th className="p-4">Comment Body</th>
              <th className="p-4">Video</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {comments.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{c.authorName}</span>
                    {c.isGuest && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 uppercase">
                        Guest
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 max-w-sm">
                  <p className="line-clamp-2 text-neutral-200">{c.body}</p>
                </td>
                <td className="p-4">
                  <Link href={`/watch/${c.videoSlug || c.videoUuid}`} target="_blank" className="font-semibold text-violet-400 hover:underline line-clamp-1">
                    {c.videoTitle}
                  </Link>
                </td>
                <td className="p-4 text-neutral-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/20 transition"
                    title="Delete Comment"
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {comments.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-neutral-500">
                  No comments reported or available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
