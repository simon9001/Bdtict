import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { budgetLineApi } from '../../features/api/BudgetLineApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { useCurrentUser, useSelectedFy } from '../../store/hooks'
import { canCreate } from '../../utils/permissions'
import { formatMoney, formatNumber } from '../../utils/format'
import PageHeader from '../../components/common/PageHeader'
import { PrimaryButton } from '../../components/common/Buttons'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import BudgetLineFormModal from '../../components/budget/BudgetLineFormModal'

/**
 * Budget lines planned for the selected financial year (replaces the four
 * budget sheets: assets, maintenance, consultancy, subscriptions).
 */
const BudgetLines: React.FC = () => {
    const navigate = useNavigate()
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const { categories, staff, currentYear } = useReferenceData()
    const filters = useUrlFilters()
    const [showForm, setShowForm] = useState(false)
    const [searchText, setSearchText] = useState(filters.getString('search') ?? '')

    // Lines with planned spend in the selected (or current) year
    const effectiveFy = fyId ?? currentYear?.fy_id
    const { data, isLoading, isFetching, error, refetch } = budgetLineApi.useGetBudgetLinesQuery(
        {
            fy_id: effectiveFy,
            category_id: filters.getNumber('category_id'),
            owner_id: filters.getNumber('owner_id'),
            search: filters.getString('search'),
            page: filters.page,
            limit: 50,
        },
        { skip: !effectiveFy },
    )
    const rows = data?.data ?? []
    const pageTotal = rows.reduce((sum, line) => sum + (line.fy_planned_amount ?? 0), 0)

    return (
        <>
            <PageHeader
                title="Budget lines"
                subtitle="What the department plans to buy, and the planned spend for this financial year"
                actions={canCreate(user) && <PrimaryButton icon={<Plus size={16} />} onClick={() => setShowForm(true)}>New budget line</PrimaryButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <form className="join w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); filters.setFilters({ search: searchText.trim() }) }}>
                    <input className="input input-sm join-item w-full border-gray-300 sm:w-56" placeholder="Search description or code"
                        value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search" />
                    <button className="btn btn-sm join-item" aria-label="Search"><Search size={16} /></button>
                </form>
                <select className="select select-sm w-full border-gray-300 sm:w-52" value={filters.getNumber('category_id') ?? ''} aria-label="Category"
                    onChange={(e) => filters.setFilters({ category_id: e.target.value })}>
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-48" value={filters.getNumber('owner_id') ?? ''} aria-label="Officer"
                    onChange={(e) => filters.setFilters({ owner_id: e.target.value })}>
                    <option value="">All officers</option>
                    {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
                {filters.hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setSearchText(''); filters.clearFilters() }}>Clear</button>}
            </div>

            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No budget lines with planned spend in this financial year." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Budget line</th>
                                    <th className="hidden lg:table-cell">Category</th>
                                    <th className="hidden md:table-cell">Officer</th>
                                    <th className="hidden lg:table-cell text-right">Qty</th>
                                    <th className="hidden lg:table-cell text-right">Unit price</th>
                                    <th className="hidden md:table-cell text-right">Line total</th>
                                    <th className="text-right">Planned this FY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((line) => (
                                    <tr key={line.budget_line_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/budget-lines/${line.budget_line_id}`)}>
                                        <td className="max-w-[13rem] sm:max-w-sm">
                                            <p className="truncate font-medium text-gray-900">{line.description}</p>
                                            <p className="text-xs text-gray-500">{[line.code, line.priority].filter(Boolean).join(' · ') || '—'}</p>
                                        </td>
                                        <td className="hidden lg:table-cell text-sm">{line.category}</td>
                                        <td className="hidden md:table-cell whitespace-nowrap text-sm">{line.owner_name}</td>
                                        <td className="hidden lg:table-cell tabular text-right">{formatNumber(line.quantity)}</td>
                                        <td className="hidden lg:table-cell tabular text-right">{formatMoney(line.unit_price)}</td>
                                        <td className="hidden md:table-cell tabular text-right">{formatMoney(line.total_amount)}</td>
                                        <td className="tabular text-right font-semibold text-gray-900">{formatMoney(line.fy_planned_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="text-gray-900">
                                    {/* The label spans however many columns are visible at this width */}
                                    <td className="text-right font-semibold md:hidden">Total on this page</td>
                                    <td colSpan={3} className="hidden text-right font-semibold md:table-cell lg:hidden">Total on this page</td>
                                    <td colSpan={6} className="hidden text-right font-semibold lg:table-cell">Total on this page</td>
                                    <td className="tabular text-right font-bold">{formatMoney(pageTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>

            <BudgetLineFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={(id) => navigate(`/budget-lines/${id}`)} />
        </>
    )
}

export default BudgetLines
