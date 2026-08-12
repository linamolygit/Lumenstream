export function VideoCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded-lg w-full" />
        <div className="h-3 bg-muted rounded-lg w-2/3" />
      </div>
    </div>
  );
}
