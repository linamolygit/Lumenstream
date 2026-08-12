export function VideoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-zinc-900">
      <div className="aspect-video animate-pulse bg-neutral-100 dark:bg-zinc-800" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
