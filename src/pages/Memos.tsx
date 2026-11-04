import React, { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { memoApi } from '../features/api/MemoApi'
import { useReferenceData } from '../hooks/useReferenceData'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useCurrentUser, useSelectedFy } from '../store/hooks'
import { PROCUREMENT_STATUSES, type Memo, type ProcurementStatus } from '../types/Types'
import { canCreate, canEditOwned } from '../utils/permissions'
import { confirmAction } from '../utils/confirm'
import { getErrorMessage } from '../utils/errors'
import { formatDate } from '../utils/format'
import PageHeader from '../components/common/PageHeader'
import QuarterSelect from '../components/common/QuarterSelect'
import { IconButton, PrimaryButton } from '../components/common/Buttons'
import StatusBadge from '../components/common/StatusBadge'
import Pagination from '../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import MemoFormModal from '../components/memos/MemoFormModal'

/**
 * Memos to the DG (T-001 on the tracker's All list sheet). One memo can request
 * several budget lines; the steps it starts are recorded on each procurement.
 */
const Memos: React.FC = () => {
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const { categories, staff } = useReferenceData()
    const filters = useUrlFilters()
    const [form, setForm] = useState<{ open: boolean; memo?: Memo }>({ open: false })

    const { data, isLoading, isFetching, error, refetch } = memoApi.useGetMemosQuery({
        fy_id: filters.getNumber('fy_id') ?? fyId,
        quarter: filters.getNumber('quarter'),
        status: filters.getString('status') as ProcurementStatus | undefined,
        category_id: filters.getNumber('category_id'),
        owner_id: filters.getNumber('owner_id'),
        page: filters.page,
        limit: 25,
    })
    const [deleteMemo] = memoApi.useDeleteMemoMutation()
    const rows = data?.data ?? []

    const handleDelete = async (memo: Memo) => {
        if (!(await confirmAction('Delete this memo?', `"${memo.title}" will be removed.`))) return
        try {
            await deleteMemo(memo.memo_id).unwrap()
            toast.success('Memo deleted')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <>
            <PageHeader
                title="Memos"
                subtitle="Memos to the DG requesting a procurement, and where each one stands"
                actions={canCreate(user) && <PrimaryButton icon={<Plus size={16} />} onClick={() => setForm({ open: true })}>New memo</PrimaryButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <QuarterSelect value={filters.getNumber('quarter')} onChange={(quarter) => filters.setFilters({ quarter })} />
                <select className="select select-sm w-full border-gray-300 sm:w-44" value={filters.getString('status') ?? ''} aria-label="Status"
                    onChange={(e) => filters.setFilters({ status: e.target.value })}>
                    <option value="">All statuses</option>
                    {PROCUREMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-52" value={filters.getNumber('category_id') ?? ''} aria-label="Category"
                    onChange={(e) => filters.setFilters({ category_id: e.target.value })}>
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-48" value={filters.getNumber('owner_id') ?? ''} aria-label="Owner"
                    onChange={(e) => filters.setFilters({ owner_id: e.target.value })}>
                    <option value="">All officers</option>
                    {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
            </div>

            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No memos here." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Memo</th>
                                    <th className="hidden lg:table-cell">Owner</th>
                                    <th className="hidden md:table-cell">Delivered</th>
                                    <th className="hidden md:table-cell">Approved</th>
                                    <th className="hidden xl:table-cell">DG approval</th>
                                    <th className="hidden sm:table-cell">Status</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((memo) => (
                                    <tr key={memo.memo_id} className="hover:bg-gray-50">
                                        <td className="max-w-[13rem] sm:max-w-md">
                                            <p className="font-medium text-gray-900">{memo.title}</p>
                                            <p className="text-xs text-gray-500">{[memo.reference, memo.category, memo.priority].filter(Boolean).join(' · ')}</p>
                                            <div className="mt-1 sm:hidden"><StatusBadge status={memo.status} /></div>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap text-sm">{memo.owner_name}</td>
                                        <td className="tabular hidden md:table-cell whitespace-nowrap text-sm">{formatDate(memo.delivered_date)}</td>
                                        <td className="tabular hidden md:table-cell whitespace-nowrap text-sm">{formatDate(memo.approved_date)}</td>
                                        <td className="hidden xl:table-cell">{memo.dg_status ? <StatusBadge status={memo.dg_status} /> : '—'}</td>
                                        <td className="hidden sm:table-cell"><StatusBadge status={memo.status} /></td>
                                        <td className="whitespace-nowrap text-right">
                                            {canEditOwned(user, memo.owner_id) && (
                                                <>
                                                    <IconButton label="Edit" onClick={() => setForm({ open: true, memo })}><Pencil size={15} /></IconButton>
                                                    <IconButton label="Delete" tone="danger" onClick={() => handleDelete(memo)}><Trash2 size={15} /></IconButton>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>

            <MemoFormModal open={form.open} memo={form.memo} onClose={() => setForm({ open: false })} />
        </>
    )
}

export default Memos
