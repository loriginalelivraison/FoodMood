// src/components/CartBadge.jsx
import { Link } from 'react-router-dom'
import { useCart } from '../store/cart.jsx'

export default function CartBadge() {
  const cartCtx = useCart()
  if (!cartCtx) return null

  const count = cartCtx.cart.items.reduce((n, it) => n + it.quantity, 0)
  const total = (cartCtx.totalCents / 100).toFixed(2)

  return (
    <Link to="/checkout" className="relative inline-flex items-center gap-2 btn">
      <span>Panier</span>
      <span className="text-xs opacity-80">{total} €</span>
      {count > 0 && (
        <span
          className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full
                     bg-[var(--brand,#f97316)] text-white text-[11px] flex items-center justify-center"
          title={`${count} article(s)`}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
