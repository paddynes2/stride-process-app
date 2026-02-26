import { Skeleton } from "@/components/ui/skeleton";

export default function ListLoading() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
