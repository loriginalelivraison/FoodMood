import { Link } from 'react-router-dom'

const catLabel = {
  PIZZA: 'Pizza',
  BURGER: 'Burger',
  JAPONAIS: 'Japonais',
  PATISSERIE: 'Pâtisserie',
  AUTRE: 'Autre',
}

export default function RestaurantCard({ r }) {
  return (
    <Link
      to={`/restaurants/${r.id}`}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100">
        {r.imageUrl && (
          <img
            src={r.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{r.name}</h3>
          <span className={`text-xs ${r.isOpen ? 'text-green-600' : 'text-zinc-400'}`}>
            {r.isOpen ? 'Ouvert' : 'Fermé'}
          </span>
        </div>
        <div className="text-xs text-zinc-500 line-clamp-2">{r.address}</div>
        <div className="pt-1">
          <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
            {catLabel[r.category] || 'Autre'}
          </span>
        </div>
      </div>
    </Link>
  )
}
