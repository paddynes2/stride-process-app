import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspacesLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-36" />
        </div>
        {/* Workspace cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
