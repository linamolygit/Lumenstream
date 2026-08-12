import Link from "next/link";

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-semibold">Video Streaming Ecosystem</h1>
        <p className="mt-4 text-slate-300">Clean proxy streaming, metadata explorer, and admin link management.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/watch/example-proxy-video" className="rounded-xl bg-slate-800 p-6 hover:bg-slate-700 transition">
            <h2 className="text-2xl font-semibold">Watch Example Video</h2>
            <p className="mt-2 text-slate-400">Demo watch page with HLS proxy link architecture.</p>
          </Link>
          <Link href="/admin/manage-stream-links" className="rounded-xl bg-slate-800 p-6 hover:bg-slate-700 transition">
            <h2 className="text-2xl font-semibold">Manage Stream Links</h2>
            <p className="mt-2 text-slate-400">Admin panel for copying permanent-looking proxy links.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
