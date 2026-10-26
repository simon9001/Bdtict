import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { contractApi } from '../../features/api/ContractApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { useCurrentUser, useSelectedFy } from '../../store/hooks'
import { CONTRACT_STATUSES, type ContractStatus } from '../../types/Types'
import { canCreate } from '../../utils/permissions'
import { formatDate, formatMoney } from '../../utils/format'
import PageHeader from '../../components/common/PageHeader'
import { PrimaryButton } from '../../components/common/Buttons'
import StatusBadge from '../../components/common/StatusBadge'
import Pagination from '../../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import ContractFormModal from '../../components/contracts/ContractFormModal'

/**
 * Contracts with what has been invoiced and paid against each.
 * "Expiring soon" ignores the year filter - an old multi-year contract can
 * expire this year.
 */
const Contracts: React.FC = () => {
    const navigate = useNavigate()
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const { staff } = useReferenceData()
    const filters = useUrlFilters()
    const [showForm, setShowForm] = useState(false)
    const [searchText, setSearchText] = useState(filters.getString('search') ?? '')

    const expiring = filters.getNumber('expiring_within_days')
    const { data, isLoading, isFetching, error, refetch } = contractApi.useGetContractsQuery({
        fy_id: expiring ? undefined : fyId,
        status: filters.getString('status') as ContractStatus | undefined,
        owner_id: filters.getNumber('owner_id'),
        expiring_within_days: expiring,
        search: filters.getString('search'),
        page: filters.page,
        limit: 25,
    })
    const rows = data?.data ?? []

    return (
        <>
            <PageHeader
                title="Contracts"
                subtitle="Awarded contracts, how much is invoiced and paid, and when they end"
                actions={canCreate(user) && <PrimaryButton icon={<Plus size={16} />} onClick={() => setShowForm(true)}>New contract</PrimaryButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <form className="join" onSubmit={(e) => { e.preventDefault(); filters.setFilters({ search: searchText.trim() }) }}>
                    <input className="input input-sm join-item w-56 border-gray-300" placeholder="Contract no. or supplier"
                        value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search" />
                    <button className="btn btn-sm join-item" aria-label="Search"><Search size={16} /></button>
                </form>
                <select className="select select-sm w-40 border-gray-300" value={filters.getString('status') ?? ''} aria-label="Status"
                    onChange={(e) => filters.setFilters({ status: e.target.value })}>
                    <option value="">All statuses</option>
                    {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="select select-sm w-48 border-gray-300" value={filters.getNumber('owner_id') ?? ''} aria-label="Officer"
                    onChange={(e) => filters.setFilters({ owner_id: e.target.value })}>
                    <option value="">All officers</option>
                    {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
                <select className="select select-sm w-48 border-gray-300" value={expiring ?? ''} aria-label="Expiring"
                    onChange={(e) => filters.setFilters({ expiring_within_days: e.target.value })}>
                    <option value="">Any end date</option>
                    <option value="30">Ending within 30 days</option>
                    <option value="60">Ending within 60 days</option>
                    <option value="90">Ending within 90 days</option>
                </select>
                {filters.hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setSearchText(''); filters.clearFilters() }}>Clear</button>}
            </div>

            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No contracts match these filters." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Supplier / contract</th>
                                    <th>Period</th>
                                    <th className="text-right">Value</th>
                                    <th className="text-right">Invoiced</th>
                                    <th className="text-right">Paid</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((c) => (
                                    <tr key={c.contract_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/contracts/${c.contract_id}`)}>
                                        <td className="max-w-xs">
                                            <p className="truncate font-medium text-gray-900">{c.supplier_name}</p>
                                            <p className="truncate text-xs text-gray-500">{c.contract_number} · {c.procurement_title}</p>
                                        </td>
                                        <td className="whitespace-nowrap text-sm">
                                            {formatDate(c.start_date)} – {formatDate(c.end_date)}
                                            {c.status === 'Active' && c.days_to_expiry <= 90 && (
                                                <p className={`text-xs ${c.days_to_expiry <= 30 ? 'text-red-700' : 'text-amber-700'}`}>
                                                    {c.days_to_expiry < 0 ? `Ended ${Math.abs(c.days_to_expiry)} days ago` : `Ends in ${c.days_to_expiry} days`}
                                                </p>
                                            )}
                                        </td>
                                        <td className="tabular text-right font-medium">{formatMoney(c.contract_value)}</td>
                                        <td className="tabular text-right">{formatMoney(c.invoiced_amount)}</td>
                                        <td className="tabular text-right">{formatMoney(c.paid_amount)}</td>
                                        <td><StatusBadge status={c.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>

            <ContractFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={(id) => navigate(`/contracts/${id}`)} />
        </>
    )
}

export default Contracts
