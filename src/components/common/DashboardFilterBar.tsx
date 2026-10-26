import React from 'react'
import { useReferenceData } from '../../hooks/useReferenceData'

interface DashboardFilterBarProps {
    categoryId?: number
    ownerId?: number
    onChange: (filters: { categoryId?: number; ownerId?: number }) => void
}

/**
 * One row of filters above the charts (category, officer). The financial year
 * comes from the top bar, so every chart on the page shows the same slice.
 */
const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({ categoryId, ownerId, onChange }) => {
    const { categories, staff } = useReferenceData()
    const toId = (value: string) => (value ? Number(value) : undefined)

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            <select
                className="select select-sm w-52 border-gray-300"
                value={categoryId ?? ''}
                onChange={(e) => onChange({ categoryId: toId(e.target.value), ownerId })}
                aria-label="Category"
            >
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
            </select>
            <select
                className="select select-sm w-52 border-gray-300"
                value={ownerId ?? ''}
                onChange={(e) => onChange({ categoryId, ownerId: toId(e.target.value) })}
                aria-label="Officer"
            >
                <option value="">All officers</option>
                {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
            </select>
            {(categoryId || ownerId) && (
                <button className="btn btn-ghost btn-sm" onClick={() => onChange({})}>Clear</button>
            )}
        </div>
    )
}

export default DashboardFilterBar
