export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="animate-pulse max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    </div>
  );
}