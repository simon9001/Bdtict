import React from 'react'
import { Link, useNavigate } from 'react-router'
import { ClipboardList, ListTodo, TriangleAlert } from 'lucide-react'
import { procurementApi } from '../features/api/ProcurementApi'
import { taskApi } from '../features/api/TaskApi'
import { useCurrentUser, useSelectedFy } from '../store/hooks'
import { taskStatusLabel } from '../types/Types'
import { formatDate } from '../utils/format'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import ProgressBar from '../components/common/ProgressBar'
import { EscalatedBadge, OverdueBadge } from '../components/common/FlagBadges'
import { EmptyState, LoadingState } from '../components/common/States'

/**
 * An officer's home view: what they own, what is late, and their tasks.
 * Items longest at their current step come first - that is what to chase.
 */
const MyWork: React.FC = () => {
    const user = useCurrentUser()
    const navigate = useNavigate()
    const fyId = useSelectedFy()

    const { data: openRes, isLoading } = procurementApi.useGetProcurementsQuery({ fy_id: fyId, mine: true, sort: 'days_in_stage', limit: 50 })
    const { data: overdueRes } = procurementApi.useGetProcurementsQuery({ fy_id: fyId, mine: true, overdue: true, limit: 1 })
    const { data: tasksRes, isLoading: tasksLoading } = taskApi.useGetTasksQuery({ mine: true, open_only: true, limit: 20 })

    // Show open work only; completed / cancelled items are on the Procurements page
    const openItems = (openRes?.data ?? []).filter((p) => !['Completed', 'Cancelled', 'Rejected'].includes(p.status))

    return (
        <>
            <PageHeader title="My work" subtitle={`Items assigned to ${user?.full_name ?? 'you'}`} />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="My open procurements" value={String(openItems.length)} icon={<ClipboardList size={22} />} accent="blue"
                    onClick={() => navigate('/procurements?mine=true')} />
                <StatCard label="Overdue" value={String(overdueRes?.pagination.total ?? 0)} hint="Past the target days for their step"
                    icon={<TriangleAlert size={22} />} accent="red" onClick={() => navigate('/procurements?mine=true&overdue=true')} />
                <StatCard label="Open tasks" value={String(tasksRes?.pagination.total ?? 0)} icon={<ListTodo size={22} />} accent="purple"
                    onClick={() => navigate('/tasks?mine=true')} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title="My procurements · longest waiting first" className="xl:col-span-2" padded={false}>
                    {isLoading ? <LoadingState /> : openItems.length === 0 ? <EmptyState message="Nothing open assigned to you." /> : (
                        <ul className="divide-y divide-gray-100">
                            {openItems.map((p) => (
                                <li key={p.procurement_id}>
                                    <Link to={`/procurements/${p.procurement_id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-gray-900">{p.title}</p>
                                            <p className="text-xs text-gray-500">
                                                {p.current_stage_name ?? 'Not started'}
                                                {p.days_in_stage != null && ` · ${p.days_in_stage} days (target ${p.sla_days})`}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {p.is_overdue && <OverdueBadge days={p.days_in_stage} sla={p.sla_days} />}
                                            {p.is_escalated && <EscalatedBadge to={p.escalated_to} />}
                                            <ProgressBar value={p.progress_percent} />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="My open tasks" padded={false} actions={<Link to="/tasks?mine=true" className="text-sm text-green-800 hover:underline">All</Link>}>
                    {tasksLoading ? <LoadingState /> : (tasksRes?.data.length ?? 0) === 0 ? <EmptyState message="No open tasks." /> : (
                        <ul className="divide-y divide-gray-100">
                            {tasksRes?.data.map((t) => (
                                <li key={t.task_id} className="px-5 py-3">
                                    <p className="text-sm font-medium text-gray-900">{t.title}</p>
                                    <div className="mt-1 flex items-center gap-2 text-xs">
                                        <StatusBadge status={taskStatusLabel(t.status)} />
                                        {t.due_date && <span className={t.is_overdue ? 'font-semibold text-red-700' : 'text-gray-500'}>Due {formatDate(t.due_date)}</span>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    )
}

export default MyWork
