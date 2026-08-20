export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 animate-pulse">
      <div className="h-44 bg-gray-200 dark:bg-zinc-800" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-12 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-9 bg-gray-200 dark:bg-zinc-800 rounded-full w-2/3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}