import { Skeleton } from "@/components/ui/skeleton";

export default function GapAnalysisLoading() {
  return (
    <div className="p-6">
      {/* Header */}
      <Skeleton className="h-7 w-36 mb-6" />
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-8 w-40" />
      </div>
      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
