import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router'
import { dashboardApi } from '../../features/api/DashboardApi'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import type { DashboardFilters, TopBudgetLine } from '../../types/Types'
import { formatMoney, formatMoneyCompact } from '../../utils/format'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, RADIUS_HORIZONTAL, SERIES, tickStyle } from './chartTheme'

/**
 * "Where is most of the money going?"
 * The largest budget lines of the year, ranked. One series, so one colour.
 */

const COLUMNS: TableColumn<TopBudgetLine>[] = [
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Budget line' },
    { key: 'planned_amount', label: 'Planned', align: 'right', format: (v) => formatMoney(v as number) },
]

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const TopBudgetLinesChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const { data, isLoading, error } = dashboardApi.useGetTopBudgetLinesQuery(filters)
    const small = useIsSmallScreen()
    const navigate = useNavigate()
    const rows = data?.data ?? []

    return (
        <ChartCard
            title="Largest budget lines"
            subtitle="Planned spend this financial year, biggest first · click a bar to open it"
            isLoading={isLoading}
            error={error}
            isEmpty={rows.length === 0}
            emptyMessage="No budget planned for this year yet."
            rows={rows}
            columns={COLUMNS}
            rowLink={(row) => `/budget-lines/${row.budget_line_id}`}
            className={className}
        >
            <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 34 + 40)}>
                <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid horizontal={false} stroke={CHROME.grid} />
                    <XAxis type="number" tickFormatter={formatMoneyCompact} tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} />
                    <YAxis type="category" dataKey="description" width={small ? 110 : 190} interval={0}
                        tickFormatter={(text: string) => shorten(text, small ? 16 : 30)} tick={tickStyle} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={(props) => <ChartTooltip {...props} formatValue={formatMoney} />} />
                    <Bar isAnimationActive={false} dataKey="planned_amount" name="Planned" fill={SERIES.blue} barSize={BAR_SIZE} radius={RADIUS_HORIZONTAL} className="cursor-pointer" onClick={(entry) => navigate(`/budget-lines/${(entry.payload as TopBudgetLine).budget_line_id}`)} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default TopBudgetLinesChart
