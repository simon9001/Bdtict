import React, { useState } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '../common/States'

/**
 * Card that holds one chart, with a Chart / Table toggle.
 * The table shows the exact same numbers, so every value is readable without
 * relying on colour or hovering (accessibility requirement for the charts).
 */

export interface TableColumn<Row> {
    key: keyof Row & string
    label: string
    format?: (value: Row[keyof Row], row: Row) => string
    align?: 'left' | 'right'
}

interface ChartCardProps<Row> {
    title: string
    subtitle?: string
    isLoading?: boolean
    error?: unknown
    isEmpty?: boolean
    emptyMessage?: string
    rows: Row[]
    columns: TableColumn<Row>[]
    actions?: React.ReactNode      // extra controls, e.g. a "per quarter / cumulative" switch
    children: React.ReactNode      // the chart itself
    className?: string
}

function ChartCard<Row>({
    title, subtitle, isLoading, error, isEmpty, emptyMessage = 'No data for this selection yet.',
    rows, columns, actions, children, className = '',
}: ChartCardProps<Row>) {
    const [view, setView] = useState<'chart' | 'table'>('chart')

    const body = () => {
        if (isLoading) return <LoadingState />
        if (error) return <ErrorState error={error} />
        if (isEmpty) return <EmptyState message={emptyMessage} />
        if (view === 'chart') return children

        return (
            <div className="overflow-x-auto">
                <table className="table table-sm">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={col.align === 'right' ? 'text-right' : ''}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key} className={col.align === 'right' ? 'tabular text-right' : ''}>
                                        {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <section className={`rounded-lg bg-white shadow-sm ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-5 py-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2">
                    {actions}
                    <div className="join" role="group" aria-label="View">
                        <button
                            className={`btn btn-xs join-item ${view === 'chart' ? 'btn-active' : ''}`}
                            onClick={() => setView('chart')}
                            aria-pressed={view === 'chart'}
                            title="Chart view"
                        >
                            <ChartColumn size={14} />
                        </button>
                        <button
                            className={`btn btn-xs join-item ${view === 'table' ? 'btn-active' : ''}`}
                            onClick={() => setView('table')}
                            aria-pressed={view === 'table'}
                            title="Table view"
                        >
                            <Table2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4">{body()}</div>
        </section>
    )
}

export default ChartCard
