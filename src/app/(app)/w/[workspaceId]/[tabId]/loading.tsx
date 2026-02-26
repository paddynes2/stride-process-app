import { Skeleton } from "@/components/ui/skeleton";

export default function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)]">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
