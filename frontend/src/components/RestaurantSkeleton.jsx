export default function RestaurantSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="aspect-[16/10] w-full bg-zinc-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-2/3 rounded bg-zinc-200" />
        <div className="h-3 w-1/2 rounded bg-zinc-200" />
      </div>
    </div>
  )
}
