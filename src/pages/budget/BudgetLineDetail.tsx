import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { budgetLineApi } from '../../features/api/BudgetLineApi'
import { useCurrentUser } from '../../store/hooks'
import type { Allocation } from '../../types/Types'
import { canEditOwned } from '../../utils/permissions'
import { confirmAction } from '../../utils/confirm'
import { getErrorMessage } from '../../utils/errors'
import { formatMoney, formatNumber } from '../../utils/format'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import ProgressBar from '../../components/common/ProgressBar'
import { IconButton, SecondaryButton } from '../../components/common/Buttons'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import BudgetLineFormModal from '../../components/budget/BudgetLineFormModal'
import AllocationModal from '../../components/budget/AllocationModal'

/**
 * One budget line: its cost, how it is spread across financial years and
 * quarters, and the procurements buying it.
 */
const BudgetLineDetail: React.FC = () => {
    const budgetLineId = Number(useParams().id)
    const navigate = useNavigate()
    const user = useCurrentUser()

    const { data, isLoading, error, refetch } = budgetLineApi.useGetBudgetLineByIdQuery(budgetLineId)
    const [deleteLine] = budgetLineApi.useDeleteBudgetLineMutation()
    const [deleteAllocation] = budgetLineApi.useDeleteAllocationMutation()

    const [showEdit, setShowEdit] = useState(false)
    const [allocationModal, setAllocationModal] = useState<{ open: boolean; allocation?: Allocation }>({ open: false })

    if (isLoading) return <LoadingState />
    if (error || !data) return <ErrorState error={error} onRetry={refetch} />

    const line = data.data
    const editable = canEditOwned(user, line.owner_id)
    const unallocated = line.total_amount - line.allocated_amount

    const handleDelete = async () => {
        if (!(await confirmAction('Delete this budget line?', `"${line.description}" will be removed.`))) return
        try {
            await deleteLine(line.budget_line_id).unwrap()
            toast.success('Budget line deleted')
            navigate('/budget-lines')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleDeleteAllocation = async (allocation: Allocation) => {
        if (!(await confirmAction(`Remove FY ${allocation.fy_code} plan?`, 'The planned spend for this year will be removed.', 'Yes, remove'))) return
        try {
            await deleteAllocation({ budget_line_id: line.budget_line_id, fy_id: allocation.fy_id }).unwrap()
            toast.success('Planned spend removed')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <>
            <Link to="/budget-lines" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-800">
                <ArrowLeft size={16} /> All budget lines
            </Link>

            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm text-gray-500">{[line.code, line.category, line.priority].filter(Boolean).join(' · ')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">{line.description}</h1>
                    <p className="mt-1 text-sm text-gray-600">Officer assigned: {line.owner_name}</p>
                </div>
                {editable && (
                    <div className="flex gap-2">
                        <SecondaryButton icon={<Pencil size={16} />} onClick={() => setShowEdit(true)}>Edit</SecondaryButton>
                        <SecondaryButton icon={<Trash2 size={16} />} onClick={handleDelete} className="text-red-700">Delete</SecondaryButton>
                    </div>
                )}
            </div>

            {/* Cost summary */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    ['Quantity', formatNumber(line.quantity)],
                    ['Price per unit', formatMoney(line.unit_price)],
                    ['Line total', formatMoney(line.total_amount)],
                    ['Not yet planned', formatMoney(unallocated)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            {/* Allocations */}
            <Card title="Planned spend by financial year" padded={false} className="mb-6"
                actions={editable && unallocated > 0 && (
                    <SecondaryButton icon={<Plus size={16} />} onClick={() => setAllocationModal({ open: true })}>Add year</SecondaryButton>
                )}>
                {line.allocations.length === 0 ? <EmptyState message="No planned spend yet. Add the year(s) this line will be paid in." /> : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Financial year</th>
                                    <th className="text-right">Planned</th>
                                    <th className="text-right">Q1 Jul–Sep</th>
                                    <th className="text-right">Q2 Oct–Dec</th>
                                    <th className="text-right">Q3 Jan–Mar</th>
                                    <th className="text-right">Q4 Apr–Jun</th>
                                    {editable && <th />}
                                </tr>
                            </thead>
                            <tbody>
                                {line.allocations.map((a) => (
                                    <tr key={a.fy_id}>
                                        <td className="font-medium">FY {a.fy_code}</td>
                                        <td className="tabular text-right font-semibold">{formatMoney(a.planned_amount)}</td>
                                        <td className="tabular text-right">{formatMoney(a.q1_amount)}</td>
                                        <td className="tabular text-right">{formatMoney(a.q2_amount)}</td>
                                        <td className="tabular text-right">{formatMoney(a.q3_amount)}</td>
                                        <td className="tabular text-right">{formatMoney(a.q4_amount)}</td>
                                        {editable && (
                                            <td className="whitespace-nowrap text-right">
                                                <IconButton label="Edit" onClick={() => setAllocationModal({ open: true, allocation: a })}><Pencil size={15} /></IconButton>
                                                <IconButton label="Remove" tone="danger" onClick={() => handleDeleteAllocation(a)}><Trash2 size={15} /></IconButton>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Procurements buying this line */}
            <Card title="Procurements for this line" padded={false}>
                {line.procurements.length === 0 ? <EmptyState message="No procurement linked yet." /> : (
                    <ul className="divide-y divide-gray-100">
                        {line.procurements.map((p) => (
                            <li key={p.procurement_id}>
                                <Link to={`/procurements/${p.procurement_id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-gray-900">{p.title}</p>
                                        <p className="text-xs text-gray-500">FY {p.fy_code} · {p.current_stage_name ?? 'Not started'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ProgressBar value={p.progress_percent} />
                                        <StatusBadge status={p.status} />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <BudgetLineFormModal open={showEdit} onClose={() => setShowEdit(false)} budgetLine={line} />
            <AllocationModal
                open={allocationModal.open}
                onClose={() => setAllocationModal({ open: false })}
                budgetLineId={line.budget_line_id}
                lineTotal={line.total_amount}
                allocatedElsewhere={line.allocated_amount - (allocationModal.allocation?.planned_amount ?? 0)}
                allocation={allocationModal.allocation}
                usedYearIds={line.allocations.map((a) => a.fy_id)}
            />
        </>
    )
}

export default BudgetLineDetail
