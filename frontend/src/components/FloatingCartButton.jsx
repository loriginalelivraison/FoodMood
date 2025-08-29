import { Link } from 'react-router-dom'
import { useCart } from '../store/cart.jsx'

export default function FloatingCartButton() {
  const cart = useCart()
  if (!cart) return null
  const count = cart.cart.items.reduce((n, i) => n + i.quantity, 0)
  if (count === 0) return null

  const total = (cart.totalCents / 100).toFixed(2)

  return (
    <Link
      to="/checkout"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-orange-500 px-5 py-3 text-white shadow-2xl hover:bg-orange-600 transition"
    >
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
        {count}
      </span>
      <span className="font-semibold">Voir le panier · {total} €</span>
    </Link>
  )
}
