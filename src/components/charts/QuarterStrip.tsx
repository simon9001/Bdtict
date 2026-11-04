import React from 'react'
import { Link } from 'react-router'
import { dashboardApi } from '../../features/api/DashboardApi'
import type { DashboardFilters } from '../../types/Types'
import { drillContext, drillTo } from '../../utils/drill'
import { formatMoney, formatMoneyCompact, formatPercent, todayInput } from '../../utils/format'
import { QUARTERS } from '../../utils/quarters'

/**
 * The four quarters of the financial year side by side: what was planned, what
 * has been spent, and how much of the plan that is. Click a quarter to filter the
 * whole dashboard to it; click it again to go back to the whole year.
 */

interface QuarterStripProps {
    filters: DashboardFilters
    fyCode?: string
    onSelect: (quarter?: number) => void
}

const QuarterStrip: React.FC<QuarterStripProps> = ({ filters, fyCode, onSelect }) => {
    const { data } = dashboardApi.useGetQuarterlySpendQuery(filters)
    const rows = data?.data ?? []
    const today = todayInput()
    const context = { ...drillContext(filters, data?.financial_year), quarter: undefined }

    const yearPlanned = rows[0]?.year_planned ?? 0
    const quarterPlanned = rows.reduce((sum, row) => sum + row.planned, 0)
    const yearSpent = rows.reduce((sum, row) => sum + row.actual, 0)
    const notSplit = yearPlanned - quarterPlanned

    return (
        <section className="mb-6 rounded-lg bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-5 py-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">Quarters{fyCode ? ` of ${fyCode}` : ''}</h2>
                    <p className="text-xs text-gray-500">Planned and spent per quarter · click a quarter to filter the dashboard to it</p>
                </div>
                <p className="tabular text-sm text-gray-600">Spent this year: <strong className="text-gray-900">{formatMoney(yearSpent)}</strong></p>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                {rows.map((row, index) => {
                    const number = index + 1
                    const selected = filters.quarter === number
                    const isNow = today >= row.from_date && today <= row.to_date
                    const used = row.planned > 0 ? Math.round((row.actual / row.planned) * 1000) / 10 : 0
                    return (
                        <div key={row.quarter} className={`rounded-lg border p-3 transition ${selected ? 'border-green-700 bg-green-50 ring-1 ring-green-700' : 'border-gray-200 hover:border-green-400'}`}>
                            <button type="button" aria-pressed={selected} onClick={() => onSelect(selected ? undefined : number)} className="block w-full cursor-pointer text-left">
                                <span className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{QUARTERS[index]?.label}</span>
                                    {isNow && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Now</span>}
                                </span>
                                <span className="mt-2 grid grid-cols-2 gap-2">
                                    <span>
                                        <span className="block text-xs text-gray-500">Planned</span>
                                        <span className="tabular block font-bold text-gray-900">{formatMoneyCompact(row.planned)}</span>
                                    </span>
                                    <span>
                                        <span className="block text-xs text-gray-500">Spent</span>
                                        <span className="tabular block font-bold text-gray-900">{formatMoneyCompact(row.actual)}</span>
                                    </span>
                                </span>
                                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden>
                                    <span className={`block h-full rounded-full ${used > 100 ? 'bg-red-600' : 'bg-green-700'}`} style={{ width: `${Math.min(used, 100)}%` }} />
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">{row.planned > 0 ? `${formatPercent(used)} of plan spent` : 'No plan entered for this quarter'}</span>
                            </button>
                            {row.actual > 0 && (
                                <Link to={drillTo('/payments', context, { paid_from: row.from_date, paid_to: row.to_date })} className="mt-1 inline-block text-xs text-green-800 hover:underline">See payments</Link>
                            )}
                        </div>
                    )
                })}
            </div>

            {notSplit > 0 && (
                <p className="border-t border-gray-100 px-5 py-2 text-xs text-gray-600">
                    {formatMoney(notSplit)} of this year's {formatMoney(yearPlanned)} plan is not split into quarters yet. Enter it under Expenditure Q1 to Q4 on the <Link to="/tracker/assets-infra-sw" className="text-green-800 hover:underline">sheet pages</Link>.
                </p>
            )}
        </section>
    )
}

export default QuarterStrip
