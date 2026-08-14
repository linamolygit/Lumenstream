"use client";

import { useEffect, useState } from "react";
import { FolderSimple as FolderIcon, Plus as PlusIcon, Trash as DeleteIcon, PencilSimple as EditIcon } from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";

type Category = {
  name: string;
  slug: string;
  videoCount: number;
};

export default function AdminCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const authToken = token || localStorage.getItem("lumenstream_token") || localStorage.getItem("token");
        const res = await fetch(`${apiBase}/api/admin/categories`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch {}
      setLoading(false);
    })();
  }, [apiBase, token]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    setCategories((prev) => [...prev, { name: newCategoryName.trim(), slug, videoCount: 0 }]);
    setNewCategoryName("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Categories Management</h1>
        <p className="mt-1 text-xs text-neutral-400">Organize content taxonomies across your platform.</p>
      </div>

      <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
        <input
          type="text"
          placeholder="New Category Name..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-violet-500/50"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition active:scale-95 shadow-lg shadow-violet-600/25 shrink-0"
        >
          <PlusIcon className="h-4 w-4" /> Add
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <div key={cat.slug} className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/40 p-4 transition hover:border-white/20">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-400">
                <FolderIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">{cat.name}</h3>
                <p className="text-[10px] text-neutral-500">{cat.videoCount} videos</p>
              </div>
            </div>
            <button
              onClick={() => setCategories((prev) => prev.filter((c) => c.slug !== cat.slug))}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-red-500/20 hover:text-red-400"
            >
              <DeleteIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
