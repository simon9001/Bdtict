import React from 'react'
import { Link } from 'react-router'
import { invoiceApi } from '../features/api/InvoiceApi'
import { useReferenceData } from '../hooks/useReferenceData'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useSelectedFy } from '../store/hooks'
import { formatDate, formatMoney } from '../utils/format'
import ActiveFilters from '../components/common/ActiveFilters'
import PageHeader from '../components/common/PageHeader'
import QuarterSelect from '../components/common/QuarterSelect'
import Pagination from '../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'

/**
 * Payments made in the selected financial year = the department's actual
 * expenditure. Payments are recorded from the invoice page.
 */
const Payments: React.FC = () => {
    const fyId = useSelectedFy()
    const { categories, staff } = useReferenceData()
    const filters = useUrlFilters()

    const { data, isLoading, isFetching, error, refetch } = invoiceApi.useGetPaymentsQuery({
        fy_id: filters.getNumber('fy_id') ?? fyId,
        quarter: filters.getNumber('quarter'),
        category_id: filters.getNumber('category_id'),
        owner_id: filters.getNumber('owner_id'),
        paid_from: filters.getString('paid_from'),
        paid_to: filters.getString('paid_to'),
        page: filters.page,
        limit: 50,
    })
    const rows = data?.data ?? []

    return (
        <>
            <PageHeader title="Payments" subtitle="Actual expenditure - record payments from an approved invoice" />

            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                <QuarterSelect value={filters.getNumber('quarter')} onChange={(quarter) => filters.setFilters({ quarter })} />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    From <input type="date" className="input input-sm border-gray-300" value={filters.getString('paid_from') ?? ''}
                        onChange={(e) => filters.setFilters({ paid_from: e.target.value })} />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    To <input type="date" className="input input-sm border-gray-300" value={filters.getString('paid_to') ?? ''}
                        onChange={(e) => filters.setFilters({ paid_to: e.target.value })} />
                </label>
                {filters.hasFilters && <button className="btn btn-ghost btn-sm" onClick={filters.clearFilters}>Clear</button>}
                <div className="w-full text-sm text-gray-600 sm:ml-auto sm:w-auto">
                    Total for selection: <strong className="tabular text-lg text-gray-900">{formatMoney(data?.summary.total_amount ?? 0)}</strong>
                </div>
            </div>

            <ActiveFilters items={[
                filters.getNumber('category_id') && `Category: ${categories.find((c) => c.lookup_id === filters.getNumber('category_id'))?.value ?? ''}`,
                filters.getNumber('owner_id') && `Officer: ${staff.find((u) => u.user_id === filters.getNumber('owner_id'))?.full_name ?? ''}`,
            ]} />

            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No payments in this period." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr><th>Date</th><th>Supplier</th><th className="hidden md:table-cell">Invoice</th><th className="hidden lg:table-cell">Reference</th><th className="text-right">Amount</th><th className="hidden lg:table-cell">Recorded by</th></tr>
                            </thead>
                            <tbody>
                                {rows.map((pay) => (
                                    <tr key={pay.payment_id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap">{formatDate(pay.payment_date)}</td>
                                        <td className="max-w-[9rem] sm:max-w-xs">
                                            <p className="truncate text-gray-900">{pay.supplier_name}</p>
                                            <p className="truncate text-xs text-gray-500">{pay.procurement_title}</p>
                                        </td>
                                        <td className="hidden md:table-cell"><Link className="text-green-800 hover:underline" to={`/invoices/${pay.invoice_id}`}>{pay.invoice_number}</Link></td>
                                        <td className="hidden lg:table-cell">{pay.reference ?? '—'}</td>
                                        <td className="tabular text-right font-medium">{formatMoney(pay.amount)}</td>
                                        <td className="hidden lg:table-cell text-sm">{pay.created_by_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>
        </>
    )
}

export default Payments
