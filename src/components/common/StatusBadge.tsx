import React from 'react'
import { Ban, CircleCheck, CircleDashed, CirclePause, CircleX, Clock, Hourglass, ShieldCheck, Undo2, type LucideIcon } from 'lucide-react'

/**
 * Status pill used for procurements, steps, contracts, invoices and tasks.
 * Every status has an icon + label, so meaning never depends on colour alone.
 */

interface StatusStyle {
    className: string
    icon: LucideIcon
}

const GREEN = 'bg-green-100 text-green-800'
const BLUE = 'bg-blue-100 text-blue-800'
const AMBER = 'bg-amber-100 text-amber-800'
const RED = 'bg-red-100 text-red-800'
const GRAY = 'bg-gray-100 text-gray-700'
const PURPLE = 'bg-purple-100 text-purple-800'

const STYLES: Record<string, StatusStyle> = {
    // procurements / tasks
    'Not Started': { className: GRAY, icon: CircleDashed },
    'In Progress': { className: BLUE, icon: Clock },
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
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
            <Icon size={12} aria-hidden />
            {status}
        </span>
    )
}

export default StatusBadge
