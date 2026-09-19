import Skeleton from '@/components/ui/Skeleton';

export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <Skeleton className="h-44 w-full rounded-none" rounded="rounded-none" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-9 w-2/3 rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
