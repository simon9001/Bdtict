import React from 'react'
import { useReferenceData } from '../../hooks/useReferenceData'
import { QUARTERS } from '../../utils/quarters'

export interface DashboardExtraFilters {
    categoryId?: number
    ownerId?: number
    quarter?: number
}

interface DashboardFilterBarProps extends DashboardExtraFilters {
    onChange: (filters: DashboardExtraFilters) => void
}

/**
 * One row of filters above the charts (quarter, category, officer). The financial
 * year comes from the top bar, so every chart on the page shows the same slice.
 */
const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({ categoryId, ownerId, quarter, onChange }) => {
    const { categories, staff } = useReferenceData()
    const toId = (value: string) => (value ? Number(value) : undefined)

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            <select
                className="select select-sm w-full border-gray-300 sm:w-40"
                value={quarter ?? ''}
                onChange={(e) => onChange({ categoryId, ownerId, quarter: toId(e.target.value) })}
                aria-label="Quarter"
            >
                <option value="">All quarters</option>
                {QUARTERS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
            <select
                className="select select-sm w-full border-gray-300 sm:w-52"
                value={categoryId ?? ''}
                onChange={(e) => onChange({ categoryId: toId(e.target.value), ownerId, quarter })}
                aria-label="Category"
            >
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
            </select>
            <select
                className="select select-sm w-full border-gray-300 sm:w-52"
                value={ownerId ?? ''}
                onChange={(e) => onChange({ categoryId, ownerId: toId(e.target.value), quarter })}
                aria-label="Officer"
            >
                <option value="">All officers</option>
                {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
            </select>
            {(categoryId || ownerId || quarter) && (
                <button className="btn btn-ghost btn-sm" onClick={() => onChange({})}>Clear</button>
            )}
        </div>
    )
}

export default DashboardFilterBar
