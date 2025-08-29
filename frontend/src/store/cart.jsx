// src/store/cart.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.jsx'

const CartContext = createContext(null)

function storageKeyFor(user) {
  // un panier par utilisateur connecté, sinon un panier invité
  return user?.id ? `cart:user:${user.id}` : 'cart:guest'
}

export function CartProvider({ children }) {
  const { user } = useAuth()

  const key = useMemo(() => storageKeyFor(user), [user])
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : { restaurantId: null, items: [] }
    } catch {
      return { restaurantId: null, items: [] }
    }
  })

  // recharge le panier quand l’utilisateur change (guest -> user ou inversement)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      setCart(raw ? JSON.parse(raw) : { restaurantId: null, items: [] })
    } catch {
      setCart({ restaurantId: null, items: [] })
    }
  }, [key])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(cart))
    } catch {}
  }, [key, cart])

  function clearCart() {
    setCart({ restaurantId: null, items: [] })
  }

  function addItem(restaurantId, menuItem, quantity = 1) {
    setCart(prev => {
      // si le panier contient un autre resto, on repart à zéro
      let base = prev
      if (prev.restaurantId && prev.restaurantId !== restaurantId) {
        base = { restaurantId, items: [] }
      }
      if (!base.restaurantId) base.restaurantId = restaurantId

      const idx = base.items.findIndex(i => i.menuItemId === menuItem.id)
      if (idx === -1) {
        return {
          ...base,
          items: [
            ...base.items,
            {
              menuItemId: menuItem.id,
              name: menuItem.name,
              priceCents: menuItem.priceCents,
              imageUrl: menuItem.imageUrl || null,
              quantity,
            },
          ],
        }
      } else {
        const items = base.items.slice()
        items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity }
        return { ...base, items }
      }
    })
  }

  function removeItem(menuItemId) {
    setCart(prev => ({ ...prev, items: prev.items.filter(i => i.menuItemId !== menuItemId) }))
  }

  function setQuantity(menuItemId, quantity) {
    setCart(prev => {
      const items = prev.items.map(i => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
      return { ...prev, items }
    })
  }

  const totalCents = cart.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0)

  const value = {
    cart,
    addItem,
    removeItem,
    setQuantity,
    clearCart,
    totalCents,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
