import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { invoiceApi } from '../../features/api/InvoiceApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { useCurrentUser } from '../../store/hooks'
import { INVOICE_STATUSES, type InvoiceStatus } from '../../types/Types'
import { canCreate } from '../../utils/permissions'
import { formatDate, formatMoney } from '../../utils/format'
import PageHeader from '../../components/common/PageHeader'
import { PrimaryButton } from '../../components/common/Buttons'
import StatusBadge from '../../components/common/StatusBadge'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import InvoiceFormModal from '../../components/invoices/InvoiceFormModal'

/**
 * Supplier invoices across all contracts. "Unpaid only" is the daily view:
 * what is waiting for verification, approval or payment, and for how long.
 */
const Invoices: React.FC = () => {
    const navigate = useNavigate()
    const user = useCurrentUser()
    const { staff } = useReferenceData()
    const filters = useUrlFilters()
    const [showForm, setShowForm] = useState(false)
    const [searchText, setSearchText] = useState(filters.getString('search') ?? '')

    const { data, isLoading, isFetching, error, refetch } = invoiceApi.useGetInvoicesQuery({
        status: filters.getString('status') as InvoiceStatus | undefined,
        owner_id: filters.getNumber('owner_id'),
        unpaid_only: filters.getBool('unpaid_only'),
        search: filters.getString('search'),
        page: filters.page,
        limit: 25,
    })
    const rows = data?.data ?? []

    return (
        <>
            <PageHeader
                title="Invoices"
                subtitle="Received → Verified → Approved → Paid"
                actions={canCreate(user) && <PrimaryButton icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Record invoice</PrimaryButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <form className="join w-full sm:w-auto" onSubmit={(e) => { e.preventDefault(); filters.setFilters({ search: searchText.trim() }) }}>
                    <input className="input input-sm join-item w-full border-gray-300 sm:w-56" placeholder="Invoice no. or supplier"
                        value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search" />
                    <button className="btn btn-sm join-item" aria-label="Search"><Search size={16} /></button>
                </form>
                <select className="select select-sm w-full border-gray-300 sm:w-40" value={filters.getString('status') ?? ''} aria-label="Status"
                    onChange={(e) => filters.setFilters({ status: e.target.value })}>
                    <option value="">All statuses</option>
                    {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-48" value={filters.getNumber('owner_id') ?? ''} aria-label="Officer"
                    onChange={(e) => filters.setFilters({ owner_id: e.target.value })}>
                    <option value="">All officers</option>
                    {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" className="checkbox checkbox-xs" checked={!!filters.getBool('unpaid_only')}
                        onChange={(e) => filters.setFilters({ unpaid_only: e.target.checked })} />
                    Unpaid only
                </label>
                {filters.hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setSearchText(''); filters.clearFilters() }}>Clear</button>}
            </div>

            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No invoices match these filters." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th className="hidden md:table-cell">Supplier / contract</th>
                                    <th className="hidden sm:table-cell">Received</th>
                                    <th className="hidden lg:table-cell text-right">Amount</th>
                                    <th className="text-right">Balance</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((i) => (
                                    <tr key={i.invoice_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/invoices/${i.invoice_id}`)}>
                                        <td className="max-w-[10rem] font-medium text-gray-900 md:max-w-none">
                                            {i.invoice_number}
                                            <p className="truncate text-xs font-normal text-gray-500 md:hidden">{i.supplier_name}</p>
                                        </td>
                                        <td className="hidden md:table-cell max-w-xs">
                                            <p className="truncate text-sm text-gray-900">{i.supplier_name}</p>
                                            <p className="truncate text-xs text-gray-500">{i.contract_number}</p>
                                        </td>
                                        <td className="hidden sm:table-cell whitespace-nowrap text-sm">
                                            {formatDate(i.received_date)}
                                            {i.age_days != null && (
                                                <p className={`text-xs ${i.age_days > 60 ? 'text-red-700' : i.age_days > 30 ? 'text-amber-700' : 'text-gray-500'}`}>
                                                    waiting {i.age_days} days
                                                </p>
                                            )}
                                        </td>
                                        <td className="hidden lg:table-cell tabular text-right">{formatMoney(i.amount)}</td>
                                        <td className="tabular text-right font-medium">{formatMoney(i.balance)}</td>
                                        <td><StatusBadge status={i.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>

            <InvoiceFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={(id) => navigate(`/invoices/${id}`)} />
        </>
    )
}

export default Invoices
