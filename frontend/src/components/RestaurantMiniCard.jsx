// Carte compacte pour les rangées horizontales
export default function RestaurantMiniCard({ r }) {
  return (
    <a
      href={`/restaurants/${r.id}`}
      className="w-[140px] shrink-0 rounded-xl border border-zinc-200 overflow-hidden hover:shadow-md transition bg-white"
      title={r.name}
    >
      <div className="h-[90px] w-full overflow-hidden bg-zinc-100">
        {r.imageUrl ? (
          <img src={r.imageUrl} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-zinc-400">Sans image</div>
        )}
      </div>
      <div className="p-2">
        <div className="font-medium text-sm line-clamp-1">{r.name}</div>
        {r.address && <div className="text-[11px] text-zinc-500 line-clamp-1">{r.address}</div>}
      </div>
    </a>
  )
}

