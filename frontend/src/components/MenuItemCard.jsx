export default function MenuItemCard({ item, onAdd }) {
  return (
    <div className="group flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition hover:shadow-md">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-20 w-20 flex-none rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="h-20 w-20 flex-none rounded-xl bg-zinc-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h4 className="line-clamp-1 font-semibold">{item.name}</h4>
          <div className="whitespace-nowrap text-sm font-semibold">{(item.priceCents / 100).toFixed(2)} €</div>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.description}</p>
        )}
        <div className="mt-2">
          <button
            className="btn"
            onClick={onAdd}
            aria-label={`Ajouter ${item.name} au panier`}
            title="Ajouter au panier"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}
