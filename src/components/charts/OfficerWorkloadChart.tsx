import React from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../../features/api/DashboardApi'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import type { DashboardFilters, OfficerWorkload } from '../../types/Types'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, RADIUS_HORIZONTAL, SERIES, tickStyle, legendText } from './chartTheme'

/**
 * "Who is handling what?"
 * Stacked bar per officer: their procurements by status (4 validated
 * categorical slots, fixed order). Overdue / escalated / open tasks are in
 * the tooltip and the table.
 */

const COLUMNS: TableColumn<OfficerWorkload>[] = [
    { key: 'full_name', label: 'Officer' },
    { key: 'not_started', label: 'Not started', align: 'right' },
    { key: 'in_progress', label: 'In progress', align: 'right' },
    { key: 'on_hold', label: 'On hold', align: 'right' },
    { key: 'completed', label: 'Completed', align: 'right' },
    { key: 'overdue', label: 'Overdue', align: 'right' },
    { key: 'escalated', label: 'Escalated', align: 'right' },
    { key: 'open_tasks', label: 'Open tasks', align: 'right' },
]

// Segment order = slot order; the last segment carries the rounded end
const SEGMENTS = [
    { key: 'not_started', name: 'Not started', color: SERIES.blue },
    { key: 'in_progress', name: 'In progress', color: SERIES.orange },
    { key: 'on_hold', name: 'On hold', color: SERIES.aqua },
    { key: 'completed', name: 'Completed', color: SERIES.yellow },
] as const

const OfficerWorkloadChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const { data, isLoading, error } = dashboardApi.useGetOfficerWorkloadQuery(filters)
    const rows = data?.data ?? []
    const small = useIsSmallScreen()
    const height = Math.max(200, rows.length * 40 + 70)

    return (
        <ChartCard
            title="Workload by officer"
            subtitle="Procurements owned, by status"
            isLoading={isLoading}
            error={error}
            isEmpty={rows.length === 0}
            rows={rows}
            columns={COLUMNS}
            className={className}
        >
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barCategoryGap="30%">
                    <CartesianGrid horizontal={false} stroke={CHROME.grid} />
                    <XAxis type="number" allowDecimals={false} tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} />
                    <YAxis type="category" dataKey="full_name" width={small ? 96 : 150} tick={tickStyle} axisLine={false} tickLine={false} />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        content={(props) => (
                            <ChartTooltip {...props} formatValue={(v) => String(v)}
                                extraLine={(row) => `${row.overdue} overdue · ${row.escalated} escalated · ${row.open_tasks} open tasks`} />
                        )}
                    />
                    <Legend verticalAlign="top" align="left" iconType="square" height={small ? 56 : 32} formatter={legendText} itemSorter={null} />
                    {SEGMENTS.map((segment, i) => (
                        <Bar
                            key={segment.key}
                            dataKey={segment.key}
                            name={segment.name}
                            stackId="status"
                            fill={segment.color}
                            barSize={BAR_SIZE}
                            stroke="#fff"
                            strokeWidth={2}
                            radius={i === SEGMENTS.length - 1 ? RADIUS_HORIZONTAL : undefined}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default OfficerWorkloadChart
