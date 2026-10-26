import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../../features/api/DashboardApi'
import type { AgeingBucket, DashboardFilters } from '../../types/Types'
import { formatMoney, formatMoneyCompact } from '../../utils/format'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { CHROME, ORDINAL_BLUE, RADIUS_VERTICAL, tickStyle } from './chartTheme'

/**
 * "Which invoices are unpaid, and for how long?"
 * Outstanding balance per age bucket. Buckets are ordered, so they use the
 * ordinal blue ramp (older = darker) rather than unrelated colours.
 */

const COLUMNS: TableColumn<AgeingBucket>[] = [
    { key: 'bucket', label: 'Waiting for payment' },
    { key: 'invoices', label: 'Invoices', align: 'right' },
    { key: 'amount', label: 'Outstanding', align: 'right', format: (v) => formatMoney(v as number) },
]

const InvoiceAgeingChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const { data, isLoading, error } = dashboardApi.useGetInvoiceAgeingQuery(filters)
    const rows = data?.data ?? []
    const isEmpty = rows.every((row) => row.invoices === 0)

    return (
        <ChartCard
            title="Unpaid invoices by age"
            subtitle="Outstanding balance by days since the invoice was received"
            isLoading={isLoading}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="No unpaid invoices. 🎉"
            rows={rows}
            columns={COLUMNS}
            className={className}
        >
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} stroke={CHROME.grid} />
                    <XAxis dataKey="bucket" tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} />
                    <YAxis tickFormatter={formatMoneyCompact} tick={tickStyle} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        content={(props) => <ChartTooltip {...props} formatValue={formatMoney} extraLine={(row) => `${row.invoices} invoice(s)`} />}
                    />
                    <Bar dataKey="amount" name="Outstanding" radius={RADIUS_VERTICAL} maxBarSize={56}>
                        {rows.map((row, i) => (
                            <Cell key={row.bucket} fill={ORDINAL_BLUE[i] ?? ORDINAL_BLUE[ORDINAL_BLUE.length - 1]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default InvoiceAgeingChart
