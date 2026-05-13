export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-border/50 animate-pulse rounded-lg ${className}`} />
  );
}

export function ListingSkeleton() {
  return (
    <div className="flex-shrink-0 w-64 bg-white border border-border rounded-2xl p-4 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-12 h-3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-2/3 h-4" />
      </div>
      <div className="flex justify-between items-center pt-4">
        <Skeleton className="w-20 h-5" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center p-8 text-center animate-pulse">
      <div className="w-16 h-16 bg-border/50 rounded-full mb-4" />
      <Skeleton className="w-48 h-4 mb-2" />
      <Skeleton className="w-32 h-3" />
    </div>
  );
}

export function ProfileSectionSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
      <Skeleton className="w-32 h-4 mb-6" />
      <div className="flex gap-4 items-center">
        <Skeleton className="w-20 h-20 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      </div>
    </div>
  );
}
