import React, { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router'
import { dashboardApi } from '../../features/api/DashboardApi'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import type { DashboardFilters, QuarterSpend } from '../../types/Types'
import { formatMoney, formatMoneyCompact } from '../../utils/format'
import { drillContext, drillTo } from '../../utils/drill'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, MONEY_COLORS, RADIUS_VERTICAL, tickStyle, legendText } from './chartTheme'

/**
 * "Are we spending as planned?"
 * Two views of the same numbers on ONE axis each (never a dual axis):
 *   per quarter - planned vs actual columns
 *   cumulative  - running totals as lines, shows whether spend is catching up
 */

const COLUMNS: TableColumn<QuarterSpend>[] = [
    { key: 'quarter', label: 'Quarter' },
    { key: 'planned', label: 'Planned', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'actual', label: 'Actual (paid)', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'cumulative_planned', label: 'Planned to date', align: 'right', format: (v) => formatMoney(v as number) },
    { key: 'cumulative_actual', label: 'Paid to date', align: 'right', format: (v) => formatMoney(v as number) },
]

// Kenyan FY quarter labels
const QUARTER_MONTHS: Record<string, string> = { Q1: 'Q1 Jul–Sep', Q2: 'Q2 Oct–Dec', Q3: 'Q3 Jan–Mar', Q4: 'Q4 Apr–Jun' }

const QuarterlySpendChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const [mode, setMode] = useState<'quarter' | 'cumulative'>('quarter')
    const small = useIsSmallScreen()
    const { data, isLoading, error } = dashboardApi.useGetQuarterlySpendQuery(filters)
    const rows = (data?.data ?? []).map((row) => ({ ...row, label: QUARTER_MONTHS[row.quarter] ?? row.quarter }))
    const isEmpty = rows.every((row) => row.planned === 0 && row.actual === 0)
    const navigate = useNavigate()
    const context = drillContext(filters, data?.financial_year)

    // Payments made in the quarter; the plan is on the budget lines
    const paymentsIn = (row: { from_date: string; to_date: string }) => drillTo('/payments', context, { paid_from: row.from_date, paid_to: row.to_date })
    const openQuarter = (state: { activeTooltipIndex?: unknown }) => {
        const row = rows[Number(state?.activeTooltipIndex)]
        if (row) navigate(paymentsIn(row))
    }

    const axes = (
        <>
            <CartesianGrid vertical={false} stroke={CHROME.grid} />
            <XAxis dataKey={small ? 'quarter' : 'label'} interval={0} tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} />
            <YAxis tickFormatter={formatMoneyCompact} tick={tickStyle} axisLine={false} tickLine={false} width={80} />
            <Legend verticalAlign="top" align="left" iconType="square" height={32} formatter={legendText} itemSorter={null} />
        </>
    )

    return (
        <ChartCard
            title="Planned vs actual spend"
            subtitle="Quarterly plan from budget allocations vs payments made · click to see them"
            isLoading={isLoading}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="No quarterly plan or payments recorded for this year yet."
            rows={rows}
            columns={COLUMNS}
            rowLink={paymentsIn}
            className={className}
            actions={
                <div className="join" role="group" aria-label="Spend view">
                    <button className={`btn btn-xs join-item ${mode === 'quarter' ? 'btn-active' : ''}`} onClick={() => setMode('quarter')}>Per quarter</button>
                    <button className={`btn btn-xs join-item ${mode === 'cumulative' ? 'btn-active' : ''}`} onClick={() => setMode('cumulative')}>Cumulative</button>
                </div>
            }
        >
            <ResponsiveContainer width="100%" height={300}>
                {mode === 'quarter' ? (
                    <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
                        {axes}
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={(props) => <ChartTooltip {...props} formatValue={formatMoney} />} />
                        <Bar isAnimationActive={false} dataKey="planned" name="Planned" fill={MONEY_COLORS.planned} barSize={BAR_SIZE * 2} radius={RADIUS_VERTICAL} className="cursor-pointer" onClick={() => navigate(drillTo('/budget-lines', context))} />
                        <Bar isAnimationActive={false} dataKey="actual" name="Actual (paid)" fill={MONEY_COLORS.actual} barSize={BAR_SIZE * 2} radius={RADIUS_VERTICAL} className="cursor-pointer" onClick={(entry) => navigate(paymentsIn(entry.payload as typeof rows[number]))} />
                    </BarChart>
                ) : (
                    <LineChart data={rows} margin={{ top: 4, right: 16, bottom: 0, left: 0 }} className="cursor-pointer" onClick={openQuarter}>
                        {axes}
                        <Tooltip cursor={{ stroke: CHROME.axis }} content={(props) => <ChartTooltip {...props} formatValue={formatMoney} />} />
                        <Line isAnimationActive={false} dataKey="cumulative_planned" name="Planned to date" stroke={MONEY_COLORS.planned} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        <Line isAnimationActive={false} dataKey="cumulative_actual" name="Paid to date" stroke={MONEY_COLORS.actual} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default QuarterlySpendChart
