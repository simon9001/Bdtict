import React from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../../features/api/DashboardApi'
import type { DashboardFilters, YearComparison } from '../../types/Types'
import { formatMoney, formatMoneyCompact } from '../../utils/format'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, MONEY_COLORS, RADIUS_VERTICAL, tickStyle, legendText } from './chartTheme'

/**
 * "Are we better than last year?"
 * Budget / contracted / paid for every financial year, side by side.
 * Same colours as the category chart, so "Paid" always means aqua.
 */

const COLUMNS: TableColumn<YearComparison>[] = [
    { key: 'fy_code', label: 'Financial year' },
    { key: 'budget', label: 'Budget', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'contracted', label: 'Contracted', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'paid', label: 'Paid', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'procurements', label: 'Procurements', align: 'right' },
    { key: 'completed', label: 'Completed', align: 'right' },
]

const YearComparisonChart: React.FC<{ filters: Omit<DashboardFilters, 'fy_id'>; className?: string }> = ({ filters, className }) => {
    const { data, isLoading, error } = dashboardApi.useGetYearComparisonQuery(filters)
    // Hide future years that have nothing in them yet
    const rows = (data?.data ?? []).filter((fy) => fy.budget > 0 || fy.contracted > 0 || fy.paid > 0 || fy.is_current)

    return (
        <ChartCard
            title="Year-on-year"
            subtitle="Budget, contracts and payments for each financial year"
            isLoading={isLoading}
            error={error}
            isEmpty={rows.length === 0}
            rows={rows}
            columns={COLUMNS}
            className={className}
        >
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke={CHROME.grid} />
                    <XAxis dataKey="fy_code" tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} tickFormatter={(code) => `FY ${code}`} />
                    <YAxis tickFormatter={formatMoneyCompact} tick={tickStyle} axisLine={false} tickLine={false} width={80} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={(props) => <ChartTooltip {...props} formatValue={formatMoney} />} />
                    <Legend verticalAlign="top" align="left" iconType="square" height={32} formatter={legendText} itemSorter={null} />
                    <Bar dataKey="budget" name="Budget" fill={MONEY_COLORS.budget} barSize={BAR_SIZE * 1.5} radius={RADIUS_VERTICAL} />
                    <Bar dataKey="contracted" name="Contracted" fill={MONEY_COLORS.contracted} barSize={BAR_SIZE * 1.5} radius={RADIUS_VERTICAL} />
                    <Bar dataKey="paid" name="Paid" fill={MONEY_COLORS.paid} barSize={BAR_SIZE * 1.5} radius={RADIUS_VERTICAL} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default YearComparisonChart
