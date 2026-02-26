import { Skeleton } from "@/components/ui/skeleton";

export default function TeamsLoading() {
  return (
    <div className="p-6">
      {/* Header + add button */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
      {/* Team cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <div className="space-y-3 pl-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
