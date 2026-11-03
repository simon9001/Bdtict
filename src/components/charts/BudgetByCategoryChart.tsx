import React from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../../features/api/DashboardApi'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import type { CategoryBudget, DashboardFilters } from '../../types/Types'
import { formatMoney, formatMoneyCompact } from '../../utils/format'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, MONEY_COLORS, RADIUS_HORIZONTAL, tickStyle, legendText } from './chartTheme'

/**
 * "Where is the money by category?"
 * Horizontal grouped bars (long category names read best on the y-axis):
 * budget vs contracted vs paid for each category.
 */

const COLUMNS: TableColumn<CategoryBudget>[] = [
    { key: 'category', label: 'Category' },
    { key: 'budget', label: 'Budget', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'contracted', label: 'Contracted', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'paid', label: 'Paid', align: 'right', format: (v) => formatMoney(v as number) },
]

const BudgetByCategoryChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const { data, isLoading, error } = dashboardApi.useGetBudgetByCategoryQuery(filters)
    const rows = data?.data ?? []
    const small = useIsSmallScreen()
    const height = Math.max(220, rows.length * 56 + 60) // grows with categories, includes axis band

    return (
        <ChartCard
            title="Budget by category"
            subtitle="Planned budget vs contracts awarded vs payments made"
            isLoading={isLoading}
            error={error}
            isEmpty={rows.length === 0}
            rows={rows}
            columns={COLUMNS}
            className={className}
        >
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barGap={2} barCategoryGap="24%">
                    <CartesianGrid horizontal={false} stroke={CHROME.grid} />
                    <XAxis type="number" tickFormatter={formatMoneyCompact} tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} />
                    <YAxis type="category" dataKey="category" width={small ? 96 : 150} tick={tickStyle} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={(props) => <ChartTooltip {...props} formatValue={formatMoney} />} />
                    <Legend verticalAlign="top" align="left" iconType="square" height={32} formatter={legendText} itemSorter={null} />
                    <Bar dataKey="budget" name="Budget" fill={MONEY_COLORS.budget} barSize={BAR_SIZE} radius={RADIUS_HORIZONTAL} />
                    <Bar dataKey="contracted" name="Contracted" fill={MONEY_COLORS.contracted} barSize={BAR_SIZE} radius={RADIUS_HORIZONTAL} />
                    <Bar dataKey="paid" name="Paid" fill={MONEY_COLORS.paid} barSize={BAR_SIZE} radius={RADIUS_HORIZONTAL} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default BudgetByCategoryChart
