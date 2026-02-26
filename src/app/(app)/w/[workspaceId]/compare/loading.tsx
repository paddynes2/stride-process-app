import { Skeleton } from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Side-by-side panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-[var(--radius-sm)]" />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-6 w-8" />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-[var(--radius-sm)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
