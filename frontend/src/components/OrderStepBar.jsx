// src/components/OrderStepBar.jsx
import React from 'react'

/**
 * Etapes “client” dans l'ordre logique.
 * On inclut CANCELED/ARCHIVED comme états terminaux (hors flux principal).
 */
export const ORDER_STEPS = [
  'PENDING',     // en attente
  'ACCEPTED',    // accepté par le resto
  'PREPARING',   // en préparation
  'PICKED_UP',   // récupéré par le livreur
  'DELIVERING',  // en route
  'DELIVERED',   // livré
]

const LABELS = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  PREPARING: 'En préparation',
  PICKED_UP: 'Récupérée',
  DELIVERING: 'En livraison',
  DELIVERED: 'Livrée',
  ARCHIVED: 'Archivée',
  CANCELED: 'Annulée',
}

export default function OrderStepBar({ status }) {
  // Si annulée ou archivée, on affiche un bandeau simple
  if (status === 'CANCELED' || status === 'ARCHIVED') {
    const bg = status === 'CANCELED' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'
    return (
      <div className={`rounded-xl px-4 py-3 ${bg} text-sm font-medium`}>
        Statut : {LABELS[status]}
      </div>
    )
  }

  const currentIndex = Math.max(0, ORDER_STEPS.indexOf(status))
  return (
    <div className="w-full">
      <ol className="flex items-center justify-between relative">
        {ORDER_STEPS.map((s, idx) => {
          const reached = idx <= currentIndex
          const isCurrent = idx === currentIndex
          return (
            <li key={s} className="flex-1 flex flex-col items-center">
              {/* ligne de progression */}
              {idx > 0 && (
                <div
                  className={`w-full h-1 -mt-1 mb-2 ${
                    idx <= currentIndex ? 'bg-orange-500' : 'bg-zinc-200'
                  }`}
                />
              )}
              {/* point */}
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center border-2',
                  reached ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-zinc-300 text-zinc-400',
                  isCurrent ? 'ring-2 ring-orange-200' : ''
                ].join(' ')}
                title={LABELS[s]}
              >
                {idx + 1}
              </div>
              {/* label */}
              <div className={`mt-2 text-xs text-center ${reached ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {LABELS[s]}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
