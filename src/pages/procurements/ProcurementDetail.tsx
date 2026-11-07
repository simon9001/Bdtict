import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, FilePlus2, ListPlus, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { procurementApi } from '../../features/api/ProcurementApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser } from '../../store/hooks'
import { canEditOwned } from '../../utils/permissions'
import { confirmAction } from '../../utils/confirm'
import { getErrorMessage } from '../../utils/errors'
import { formatDate, formatDateTime, formatMoney } from '../../utils/format'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import ProgressBar from '../../components/common/ProgressBar'
import { taskStatusLabel } from '../../types/Types'
import { EscalatedBadge, OverdueBadge } from '../../components/common/FlagBadges'
import { IconButton, PrimaryButton, SecondaryButton } from '../../components/common/Buttons'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import ProcurementFormModal from '../../components/procurements/ProcurementFormModal'
import RecordStageModal from '../../components/procurements/RecordStageModal'
import StageProgress from '../../components/procurements/StageProgress'
import ContractFormModal from '../../components/contracts/ContractFormModal'
import TaskFormModal from '../../components/tasks/TaskFormModal'

/**
 * One procurement: key facts, where it is in the process, the full step
 * history, and its contracts and open tasks. The owner (or the Head of ICT)
 * records steps here.
 */
const ProcurementDetail: React.FC = () => {
    const procurementId = Number(useParams().id)
    const navigate = useNavigate()
    const user = useCurrentUser()
    const { stages } = useReferenceData()

    const { data, isLoading, error, refetch } = procurementApi.useGetProcurementByIdQuery(procurementId)
    const [deleteProcurement] = procurementApi.useDeleteProcurementMutation()
    const [deleteStageEvent] = procurementApi.useDeleteStageEventMutation()

    const [modal, setModal] = useState<'edit' | 'stage' | 'contract' | 'task' | null>(null)

    if (isLoading) return <LoadingState />
    if (error || !data) return <ErrorState error={error} onRetry={refetch} />

    const p = data.data
    const editable = canEditOwned(user, p.owner_id)

    const handleDelete = async () => {
        if (!(await confirmAction('Delete this procurement?', `"${p.title}" will be removed from all lists.`))) return
        try {
            await deleteProcurement(p.procurement_id).unwrap()
            toast.success('Procurement deleted')
            navigate('/procurements')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleUndoStep = async (eventId: number, stageName: string) => {
        if (!(await confirmAction('Remove this step update?', `The "${stageName}" update will be removed and the current step recalculated.`, 'Yes, remove'))) return
        try {
            await deleteStageEvent({ procurement_id: p.procurement_id, event_id: eventId }).unwrap()
            toast.success('Step update removed')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    // Key facts shown in the summary card
    const facts: [string, React.ReactNode][] = [
        ['Financial year', p.fy_code],
        ['Category', p.category],
        ['Priority', p.priority ?? '—'],
        ['Owner', p.owner_name],
        ['Acquisition method', p.acquisition_method ?? '—'],
        ['SCM officer', p.scm_officer ?? '—'],
        ['Budget line', p.budget_line_id
            ? <Link key="budget-line" className="text-green-800 hover:underline" to={`/budget-lines/${p.budget_line_id}`}>{p.budget_line_code ?? p.budget_line_description}</Link>
            : '—'],
        ['Tender float / opening', p.tender_float_date
            ? `${formatDate(p.tender_float_date)} → ${formatDate(p.tender_opening_date)}${p.tender_days != null ? ` (${p.tender_days} days)` : ''}`
            : '—'],
    ]

    return (
        <>
            <Link to="/procurements" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-800">
                <ArrowLeft size={16} /> All procurements
            </Link>

            {/* Header */}
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={p.status} />
                        {p.is_overdue && <OverdueBadge days={p.days_in_stage} sla={p.sla_days} />}
                        {p.is_escalated && <EscalatedBadge to={p.escalated_to} />}
                        {p.reference && <span className="text-sm text-gray-500">{p.reference}</span>}
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">{p.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span>Current step: <strong className="text-gray-900">{p.current_stage_name ?? 'Not started'}</strong></span>
                        {p.days_in_stage != null && <span>· {p.days_in_stage} days (target {p.sla_days})</span>}
                        <ProgressBar value={p.progress_percent} />
                    </div>
                </div>
                {editable && (
                    <div className="flex flex-wrap gap-2">
                        <PrimaryButton icon={<ListPlus size={16} />} onClick={() => setModal('stage')}>Record step</PrimaryButton>
                        <SecondaryButton icon={<Pencil size={16} />} onClick={() => setModal('edit')}>Edit</SecondaryButton>
                        <SecondaryButton icon={<Trash2 size={16} />} onClick={handleDelete} className="text-red-700">Delete</SecondaryButton>
                    </div>
                )}
            </div>

            {p.is_escalated && (p.escalated_to || p.escalation_note) && (
                <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                    <strong>Escalated{p.escalated_to ? ` to ${p.escalated_to}` : ''}.</strong> {p.escalation_note}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Facts */}
                <Card title="Details">
                    <dl className="space-y-3 text-sm">
                        {facts.map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-4">
                                <dt className="text-gray-500">{label}</dt>
                                <dd className="text-right font-medium text-gray-900">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    {p.notes && <p className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{p.notes}</p>}
                </Card>

                {/* History */}
                <Card title="Step history" className="xl:col-span-2" padded={false}>
                    {p.history.length === 0 ? (
                        <EmptyState message="No steps recorded yet."
                            action={editable && <PrimaryButton icon={<Plus size={16} />} onClick={() => setModal('stage')}>Record the first step</PrimaryButton>} />
                    ) : (
                        <ol className="divide-y divide-gray-100">
                            {p.history.map((event) => (
                                <li key={event.event_id} className="flex items-start gap-3 px-5 py-3">
                                    <div className="w-24 shrink-0 text-sm text-gray-500 tabular">{formatDate(event.event_date)}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-gray-900">{event.stage_name}</span>
                                            <StatusBadge status={event.status} />
                                        </div>
                                        {event.notes && <p className="mt-0.5 text-sm text-gray-600">{event.notes}</p>}
                                        <p className="mt-0.5 text-xs text-gray-500">Recorded by {event.recorded_by_name} · {formatDateTime(event.created_at)}</p>
                                    </div>
                                    {editable && (
                                        <IconButton label="Remove this update" onClick={() => handleUndoStep(event.event_id, event.stage_name)}>
                                            <Undo2 size={16} />
                                        </IconButton>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>

            {/* Whole process */}
            <Card title="Process progress" className="mt-6">
                <StageProgress stages={stages} currentStageId={p.current_stage_id} isCompleted={p.status === 'Completed'} />
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Contracts */}
                <Card title="Contracts" padded={false}
                    actions={editable && <SecondaryButton icon={<FilePlus2 size={16} />} onClick={() => setModal('contract')}>Add contract</SecondaryButton>}>
                    {p.contracts.length === 0 ? <EmptyState message="No contract yet." /> : (
                        <ul className="divide-y divide-gray-100">
                            {p.contracts.map((c) => (
                                <li key={c.contract_id}>
                                    <Link to={`/contracts/${c.contract_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-gray-900">{c.supplier_name}</p>
                                            <p className="text-xs text-gray-500">{c.contract_number} · {formatDate(c.start_date)} – {formatDate(c.end_date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="tabular text-sm font-semibold text-gray-900">{formatMoney(c.contract_value)}</p>
                                            <StatusBadge status={c.status} />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Tasks */}
                <Card title="Open follow-up tasks" padded={false}
                    actions={editable && <SecondaryButton icon={<Plus size={16} />} onClick={() => setModal('task')}>Add task</SecondaryButton>}>
                    {p.open_tasks.length === 0 ? <EmptyState message="No open tasks." /> : (
                        <ul className="divide-y divide-gray-100">
                            {p.open_tasks.map((t) => (
                                <li key={t.task_id} className="flex items-center justify-between gap-3 px-5 py-3">
                                    <span className="text-sm text-gray-900">{t.title}</span>
                                    <span className="flex items-center gap-2 text-xs text-gray-500">
                                        {t.due_date && `Due ${formatDate(t.due_date)}`}
                                        <StatusBadge status={taskStatusLabel(t.status)} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <ProcurementFormModal open={modal === 'edit'} onClose={() => setModal(null)} procurement={p} />
            <RecordStageModal open={modal === 'stage'} onClose={() => setModal(null)} procurementId={p.procurement_id} currentStageId={p.current_stage_id} />
            <ContractFormModal open={modal === 'contract'} onClose={() => setModal(null)} procurementId={p.procurement_id} />
            <TaskFormModal open={modal === 'task'} onClose={() => setModal(null)} procurementId={p.procurement_id} />
        </>
    )
}

export default ProcurementDetail
