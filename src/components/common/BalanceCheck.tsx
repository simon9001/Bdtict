import React from 'react'
import { Link } from 'react-router'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { dashboardApi } from '../../features/api/DashboardApi'
import type { DashboardFilters } from '../../types/Types'

/**
 * Says whether the books balance: each budget line's yearly plans equal its Total
 * Sum, its contracts stay within that total, and no year is paid beyond its plan.
 * Saves that break these are refused, so anything listed needs someone to look at it.
 */
const BalanceCheck: React.FC<{ filters: DashboardFilters }> = ({ filters }) => {
    const { data } = dashboardApi.useGetBalanceChecksQuery(filters)
    const checks = data?.data
    if (!checks) return null

    if (checks.issues.length === 0) {
        return (
            <p className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-900">
                <CircleCheck size={16} className="shrink-0" aria-hidden />
                Balanced: all {checks.lines_checked} budget lines have plans equal to their Total Sum, contracts within it, and payments within each year's plan.
            </p>
        )
    }

    return (
        <section className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
                <TriangleAlert size={16} className="shrink-0" aria-hidden />
                {checks.issues.length} balance {checks.issues.length === 1 ? 'problem' : 'problems'} to fix
            </p>
            <ul className="mt-2 space-y-1">
                {checks.issues.map((issue, index) => (
                    <li key={`${issue.budget_line_id}-${index}`}>
                        <Link to={`/budget-lines/${issue.budget_line_id}`} className="font-medium underline">{issue.code ?? issue.description}</Link>: {issue.problem}
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default BalanceCheck
