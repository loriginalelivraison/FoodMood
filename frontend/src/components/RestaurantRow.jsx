import RestaurantMiniCard from './RestaurantMiniCard.jsx'

export default function RestaurantRow({ title, items = [], onSeeAll }) {
  if (!items.length) return null
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-xs text-[var(--brand,#f97316)] hover:underline">
            Voir tout
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]
                      [&::-webkit-scrollbar]:hidden">
        {items.map((r) => (
          <RestaurantMiniCard key={r.id} r={r} />
        ))}
      </div>
    </section>
  )
}

