import React from 'react'
import { Ban, CircleCheck, CircleDashed, CirclePause, CircleX, Clock, Eye, Hourglass, ShieldCheck, Undo2, type LucideIcon } from 'lucide-react'

/**
 * Status pill used for procurements, steps, contracts, invoices and tasks.
 * Every status has an icon + label, so meaning never depends on colour alone.
 */

interface StatusStyle {
    className: string
    icon: LucideIcon
}

// Light fill, dark text and a thin outline of the same colour, so each pill stands out on white rows
const GREEN = 'bg-green-50 text-green-800 ring-green-600/30'
const BLUE = 'bg-blue-50 text-blue-800 ring-blue-600/30'
const AMBER = 'bg-amber-50 text-amber-900 ring-amber-600/40'
const RED = 'bg-red-50 text-red-800 ring-red-600/30'
const GRAY = 'bg-gray-50 text-gray-700 ring-gray-500/30'
const PURPLE = 'bg-purple-50 text-purple-800 ring-purple-600/30'

const STYLES: Record<string, StatusStyle> = {
    // procurements / tasks
    'Not Started': { className: GRAY, icon: CircleDashed },
    'In Progress': { className: BLUE, icon: Clock },
    'In Review': { className: PURPLE, icon: Eye },
    'On Hold': { className: AMBER, icon: CirclePause },
    Completed: { className: GREEN, icon: CircleCheck },
    Cancelled: { className: GRAY, icon: Ban },
    Rejected: { className: RED, icon: CircleX },
    Open: { className: GRAY, icon: CircleDashed },
    Done: { className: GREEN, icon: CircleCheck },
    // workflow steps
    Pending: { className: AMBER, icon: Hourglass },
    Approved: { className: GREEN, icon: CircleCheck },
    Returned: { className: PURPLE, icon: Undo2 },
    // contracts
    Active: { className: BLUE, icon: Clock },
    Expired: { className: AMBER, icon: Hourglass },
    Terminated: { className: RED, icon: Ban },
    // invoices
    Received: { className: GRAY, icon: CircleDashed },
    Verified: { className: PURPLE, icon: ShieldCheck },
    Paid: { className: GREEN, icon: CircleCheck },
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const style = STYLES[status] ?? { className: GRAY, icon: CircleDashed }
    const Icon = style.icon
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}>
            <Icon size={12} aria-hidden />
            {status}
        </span>
    )
}

export default StatusBadge
