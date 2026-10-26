import React from 'react'
import { CHROME } from './chartTheme'

/**
 * Hover tooltip shared by all charts.
 * Text stays in neutral ink; a small colour swatch carries the series identity.
 */

interface TooltipEntry {
    name?: string | number
    value?: number | string | readonly (number | string)[]
    color?: string
    dataKey?: string | number | ((obj: unknown) => unknown)
    payload?: Record<string, unknown>
}

interface ChartTooltipProps {
    active?: boolean
    label?: string | number
    payload?: readonly TooltipEntry[]
    formatValue: (value: number, entry: TooltipEntry) => string
    extraLine?: (row: Record<string, unknown>) => string | null // e.g. "3 invoices"
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, label, payload, formatValue, extraLine }) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload ?? {}
    const extra = extraLine?.(row)

    return (
        <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-lg">
            {label !== undefined && <p className="mb-1 font-semibold" style={{ color: CHROME.textPrimary }}>{label}</p>}
            {payload.map((entry) => (
                <div key={String(entry.dataKey)} className="flex items-center gap-2" style={{ color: CHROME.textSecondary }}>
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: entry.color }} aria-hidden />
                    <span>{entry.name}:</span>
                    <span className="tabular font-medium" style={{ color: CHROME.textPrimary }}>
                        {formatValue(Number(entry.value), entry)}
                    </span>
                </div>
            ))}
            {extra && <p className="mt-1 text-xs" style={{ color: CHROME.textSecondary }}>{extra}</p>}
        </div>
    )
}

export default ChartTooltip

