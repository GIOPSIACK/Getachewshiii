import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer rounded-xl bg-muted", className)} />
  );
}

export function TicketSkeleton() {
  return (
    <div className="bg-card rounded-[1.5rem] border border-border p-4 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="w-9 h-14 rounded-xl" />
      </div>
      <Skeleton className="h-px w-full mb-4" />
      <div className="flex gap-2 justify-center">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="w-8 h-8 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="px-4 space-y-4 pt-4">
      <Skeleton className="w-full aspect-[16/10] rounded-[1.5rem]" />
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
      </div>
      <Skeleton className="h-5 w-40 rounded" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
