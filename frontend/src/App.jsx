// frontend/src/App.jsx
import { Routes, Route, Navigate, Link, NavLink, useLocation } from "react-router-dom"
import { useEffect, useRef, useState } from "react"

import Restaurants from "./pages/Restaurants.jsx"
import RestaurantDetail from "./pages/RestaurantDetail.jsx"
import Checkout from "./pages/Checkout.jsx"
import OwnerDashboard from "./pages/OwnerDashboard.jsx"
import CourierDashboard from "./pages/CourierDashboard.jsx"
import CustomerOrders from "./pages/orders/CustomerOrders.jsx"
import RestaurantOrders from "./pages/orders/RestaurantOrders.jsx"
import OrderDetail from "./pages/orders/OrderDetail.jsx"
import AdminDashboard from "./pages/AdminDashboard.jsx"
import Auth from "./pages/Auth.jsx"

import ProtectedRoute from "./components/ProtectedRoute.jsx"
import { useAuth } from "./auth/useAuth.jsx"

import { NotificationsProvider } from './context/Notifications.jsx'
import NotificationBell from './components/NotificationBell.jsx'

// Remplace par ton logo si besoin
import logoUrl from "./assets/logo.png"

/* --------------------------------------------- */
/* Nav                                           */
/* --------------------------------------------- */
function TopNav() {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const isCustomer = user?.role === "CUSTOMER"
  const isOwner = user?.role === "OWNER"
  const isCourier = user?.role === "COURIER"
  const isAdmin = user?.role === "ADMIN"

  useEffect(() => { setOpen(false); setMenuOpen(false) }, [loc.pathname])

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener("click", onClickOutside)
    return () => document.removeEventListener("click", onClickOutside)
  }, [menuOpen])

  const baseBtn =
    "inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-white transition"
  const activeBtn = "ring-2 ring-offset-0 ring-orange-500"
  const NavBtn = ({ to, children }) => (
    <NavLink to={to} className={({ isActive }) => `${baseBtn} ${isActive ? activeBtn : ""}`}>
      {children}
    </NavLink>
  )

  return (
    <header className="sticky top-0 z-50 border-b bg-transparent">
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500" />
      <nav className="container flex h-14 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            className={`${baseBtn} md:hidden h-9 w-9 justify-center px-0`}
            onClick={() => setOpen(o => !o)}
            aria-label="Ouvrir le menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2"/></svg>
          </button>

          <Link to="/" className="mr-1">
            <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain ml-[-6px]" />
          </Link>

          <div className="ml-1 hidden items-center gap-2 md:flex">
            <NavBtn to="/">Restaurants</NavBtn>
            {isCustomer && <NavBtn to="/orders">Mes commandes</NavBtn>}
            {isOwner && <NavBtn to="/owner">Mon restaurant</NavBtn>}
            {isCourier && <NavBtn to="/courier">Mes livraisons</NavBtn>}
            {isAdmin && <NavBtn to="/admin">Admin</NavBtn>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && <NotificationBell />}
          {!user ? (
            <Link to="/auth" className={baseBtn}>Connexion / Inscription</Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(m => !m)} className={`${baseBtn}`} aria-label="Menu utilisateur">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {(user?.name || user?.email || 'U').slice(0,1).toUpperCase()}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" className="ml-1 opacity-60"><path fill="currentColor" d="M7 10l5 5 5-5z" /></svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border bg-white shadow-lg">
                  <div className="px-3 py-2 text-xs text-zinc-500">Connecté en <span className="font-medium">{user.role}</span></div>
                  <div className="h-px bg-zinc-100" />
                  <div className="py-1 text-sm">
                    <NavLink to="/" className="block px-3 py-2 hover:bg-zinc-50">Restaurants</NavLink>
                    {isCustomer && <NavLink to="/orders" className="block px-3 py-2 hover:bg-zinc-50">Mes commandes</NavLink>}
                    {isOwner && <>
                      <NavLink to="/owner" className="block px-3 py-2 hover:bg-zinc-50">Mon restaurant</NavLink>
                      <NavLink to="/owner/orders" className="block px-3 py-2 hover:bg-zinc-50">Commandes du resto</NavLink>
                    </>}
                    {isCourier && <NavLink to="/courier" className="block px-3 py-2 hover:bg-zinc-50">Mes livraisons</NavLink>}
                    {isAdmin && <NavLink to="/admin" className="block px-3 py-2 hover:bg-zinc-50">Admin</NavLink>}
                  </div>
                  <div className="h-px bg-zinc-100" />
                  <button onClick={logout} className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50">Déconnexion</button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {open && (
        <div className="border-b bg-white/95 md:hidden">
          <div className="container flex flex-col gap-2 py-2">
            <NavBtn to="/">Restaurants</NavBtn>
            {isCustomer && <NavBtn to="/orders">Mes commandes</NavBtn>}
            {isOwner && <NavBtn to="/owner">Mon restaurant</NavBtn>}
            {isCourier && <NavBtn to="/courier">Mes livraisons</NavBtn>}
            {isAdmin && <NavBtn to="/admin">Admin</NavBtn>}
            {!user ? (
              <Link to="/auth" className={baseBtn}>Connexion / Inscription</Link>
            ) : (
              <button onClick={logout} className={`${baseBtn} text-red-600`}>Déconnexion</button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/* --------------------------------------------- */
/* App                                           */
/* --------------------------------------------- */
export default function App() {
  return (
    <NotificationsProvider>
      <TopNav />
      <Routes>
        <Route path="/" element={<Restaurants />} />
        <Route path="/restaurants/:id" element={<RestaurantDetail />} />
        <Route path="/checkout" element={<Checkout />} />

        {/* Auth */}
        <Route path="/auth" element={<Auth />} />

        {/* Customer */}
        <Route path="/orders" element={<ProtectedRoute roles={["CUSTOMER"]}><CustomerOrders /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute roles={["CUSTOMER"]}><OrderDetail /></ProtectedRoute>} />

        {/* Owner */}
        <Route path="/owner" element={<ProtectedRoute roles={["OWNER"]}><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/owner/orders" element={<ProtectedRoute roles={["OWNER"]}><RestaurantOrders /></ProtectedRoute>} />

        {/* Courier */}
        <Route path="/courier" element={<ProtectedRoute roles={["COURIER"]}><CourierDashboard /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotificationsProvider>
  )
}
