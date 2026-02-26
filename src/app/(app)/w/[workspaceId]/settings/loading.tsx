import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <Skeleton className="h-7 w-28 mb-6" />
      {/* Settings sections */}
      <div className="space-y-6">
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-8 w-full mb-3" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-8 w-full mb-3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
