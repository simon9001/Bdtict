import React from 'react'
import { Flag, TriangleAlert } from 'lucide-react'

// Small "Overdue" / "Escalated" markers shown next to a procurement

export const OverdueBadge: React.FC<{ days?: number | null; sla?: number | null }> = ({ days, sla }) => (
    <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
        title={days != null && sla != null ? `${days} days at this step (target ${sla})` : undefined}
    >
        <TriangleAlert size={12} aria-hidden />
        Overdue
    </span>
)

export const EscalatedBadge: React.FC<{ to?: string | null }> = ({ to }) => (
    <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
        title={to ? `Escalated to ${to}` : undefined}
    >
        <Flag size={12} aria-hidden />
        Escalated
    </span>
)
