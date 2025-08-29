export default function MenuSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 animate-pulse">
      <div className="h-20 w-20 flex-none rounded-xl bg-zinc-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-zinc-200" />
        <div className="h-3 w-2/3 rounded bg-zinc-200" />
        <div className="h-3 w-1/3 rounded bg-zinc-200" />
      </div>
    </div>
  )
}

