// src/hooks/useLiveCouriers.js
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

/**
 * Écoute l'event 'courier:position' émis par le backend et
 * maintient une map { courierId -> {lat,lng,updatedAt} }.
 * 
 * options:
 *   - onlyIds: Set<number> (facultatif) => ne garde que ces livreurs
 */
export default function useLiveCouriers({ onlyIds } = {}) {
  const [couriers, setCouriers] = useState({}) // { [id]: { lat, lng, updatedAt } }
  const socketRef = useRef(null)

  useEffect(() => {
    const url = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    const socket = io(url, { transports: ['websocket'] })
    socketRef.current = socket

    const onPos = (payload) => {
      const { courierId, lat, lng, updatedAt } = payload || {}
      if (courierId == null || lat == null || lng == null) return
      if (onlyIds && !onlyIds.has(courierId)) return
      setCouriers(prev => ({
        ...prev,
        [courierId]: { lat, lng, updatedAt: updatedAt || new Date().toISOString() }
      }))
    }

    socket.on('courier:position', onPos)

    return () => {
      socket.off('courier:position', onPos)
      socket.disconnect()
      socketRef.current = null
    }
  }, [onlyIds?.size])

  // expose aussi un tableau pratique
  const list = Object.entries(couriers).map(([id, p]) => ({ courierId: Number(id), ...p }))

  return { couriers, list }
}
