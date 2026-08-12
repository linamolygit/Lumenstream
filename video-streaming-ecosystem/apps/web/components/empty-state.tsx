import { Play } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-black/5 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-zinc-900">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-600">
        <Play className="h-6 w-6 text-neutral-400" />
      </div>
      <h3 className="text-base font-semibold">Nothing here yet</h3>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">
        We&apos;re working on more amazing content. Check back soon!
      </p>
    </div>
  );
}
