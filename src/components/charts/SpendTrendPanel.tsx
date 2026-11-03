import React from 'react'
import { Link, useNavigate } from 'react-router'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../../features/api/DashboardApi'
import type { DashboardFilters, DashboardSummary } from '../../types/Types'
import { formatMoney, formatMoneyCompact, formatPercent } from '../../utils/format'
import { drillContext, drillTo, drillWithoutYear } from '../../utils/drill'
import ChartTooltip from './ChartTooltip'

/**
 * The money story of the year on one dark panel: how much is budgeted, how much
 * of it has been committed and paid, and invoices and payments month by month.
 */

const PAID = '#ffffff'
const INVOICED = '#86efac'
const TICK = { fill: '#bbf7d0', fontSize: 12 }

const Figure: React.FC<{ label: string; value: string; hint?: string; to: string }> = ({ label, value, hint, to }) => (
    <Link to={to} className="-m-1 block min-w-0 rounded p-1 hover:bg-white/10">
        <p className="text-xs text-green-200">{label}</p>
        <p className="tabular truncate text-lg font-bold">{value}</p>
        {hint && <p className="text-xs text-green-200">{hint}</p>}
    </Link>
)

interface SpendTrendPanelProps {
    filters: DashboardFilters
    summary?: DashboardSummary
    fyCode?: string
    className?: string
}

const SpendTrendPanel: React.FC<SpendTrendPanelProps> = ({ filters, summary, fyCode, className = '' }) => {
    const { data } = dashboardApi.useGetMonthlyTrendQuery(filters)
    const rows = data?.data ?? []
    const hasMovement = rows.some((row) => row.paid > 0 || row.invoiced > 0)
    const navigate = useNavigate()
    const context = drillContext(filters, data?.financial_year)

    const openMonth = (state: { activeTooltipIndex?: unknown }) => {
        const row = rows[Number(state?.activeTooltipIndex)]
        if (row) navigate(drillTo('/payments', context, { paid_from: row.from_date, paid_to: row.to_date }))
    }
    const committedPercent = summary && summary.budget > 0 ? Math.round((summary.contracted / summary.budget) * 1000) / 10 : 0

    return (
        <section className={`rounded-lg bg-gradient-to-br from-green-950 to-green-800 p-5 text-white shadow-sm ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-sm text-green-100">Budget {fyCode}</p>
                    <Link to={drillTo('/budget-lines', context)} className="tabular block text-3xl font-bold hover:underline">{formatMoneyCompact(summary?.budget)}</Link>
                    <p className="tabular text-xs text-green-200">{formatMoney(summary?.budget)}</p>
                </div>
                <div className="flex gap-4 text-xs text-green-100">
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: PAID }} aria-hidden />Paid</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: INVOICED }} aria-hidden />Invoiced</span>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Figure label="Contracted" value={formatMoneyCompact(summary?.contracted)} hint={`${formatPercent(committedPercent)} of budget`} to={drillTo('/contracts', context)} />
                <Figure label="Invoiced" value={formatMoneyCompact(summary?.invoiced)} to={drillWithoutYear('/invoices', context)} />
                <Figure label="Paid" value={formatMoneyCompact(summary?.paid)} hint={`${formatPercent(summary?.budget_utilisation_percent ?? 0)} of budget`} to={drillTo('/payments', context)} />
                <Figure label="Unpaid invoices" value={formatMoneyCompact(summary?.outstanding)} hint={`${summary?.unpaid_invoices ?? 0} waiting`} to={drillWithoutYear('/invoices', context, { unpaid_only: true })} />
            </div>

            <p className="mb-1 mt-5 text-sm font-medium text-green-100">Month by month{hasMovement ? ' · click a month to see its payments' : ' (no invoices or payments recorded yet)'}</p>
            <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} className={hasMovement ? 'cursor-pointer' : ''} onClick={hasMovement ? openMonth : undefined}>
                    <defs>
                        <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PAID} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={PAID} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.15)" />
                    <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tickFormatter={formatMoneyCompact} tick={TICK} axisLine={false} tickLine={false} width={72} />
                    <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.4)' }} content={(props) => <ChartTooltip {...props} formatValue={formatMoney} />} />
                    <Area isAnimationActive={false} type="monotone" dataKey="invoiced" name="Invoiced" stroke={INVOICED} strokeWidth={2} fill="none" />
                    <Area isAnimationActive={false} type="monotone" dataKey="paid" name="Paid" stroke={PAID} strokeWidth={2} fill="url(#paidFill)" />
                </AreaChart>
            </ResponsiveContainer>

            {/* The same figures for screen readers */}
            <table className="sr-only">
                <caption>Invoices and payments by month</caption>
                <thead><tr><th>Month</th><th>Invoiced</th><th>Paid</th></tr></thead>
                <tbody>
                    {rows.map((row) => <tr key={row.month}><td>{row.month}</td><td>{formatMoney(row.invoiced)}</td><td>{formatMoney(row.paid)}</td></tr>)}
                </tbody>
            </table>
        </section>
    )
}

export default SpendTrendPanel
