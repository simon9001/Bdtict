import React, { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { CircleCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { taskApi } from '../features/api/TaskApi'
import { useReferenceData } from '../hooks/useReferenceData'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useCurrentUser } from '../store/hooks'
import { TASK_STATUSES, type Task, type TaskStatus } from '../types/Types'
import { canCreate, canEditOwned } from '../utils/permissions'
import { confirmAction } from '../utils/confirm'
import { getErrorMessage } from '../utils/errors'
import { formatDate } from '../utils/format'
import PageHeader from '../components/common/PageHeader'
import { IconButton, PrimaryButton } from '../components/common/Buttons'
import StatusBadge from '../components/common/StatusBadge'
import Pagination from '../components/common/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import TaskFormModal from '../components/tasks/TaskFormModal'

/**
 * Follow-up tasks (replaces the "Follow up on ..." sections of the sheet).
 * Opens on "open tasks" by default; tick a task off with one click.
 */
const Tasks: React.FC = () => {
    const user = useCurrentUser()
    const { staff } = useReferenceData()
    const filters = useUrlFilters()
    const [form, setForm] = useState<{ open: boolean; task?: Task }>({ open: false })

    const status = filters.getString('status') as TaskStatus | undefined
    const showAll = filters.getBool('all')
    const { data, isLoading, isFetching, error, refetch } = taskApi.useGetTasksQuery({
        status,
        open_only: !status && !showAll ? true : undefined,
        owner_id: filters.getNumber('owner_id'),
        mine: filters.getBool('mine'),
        overdue: filters.getBool('overdue'),
        page: filters.page,
        limit: 25,
    })
    const [updateTask] = taskApi.useUpdateTaskMutation()
    const [deleteTask] = taskApi.useDeleteTaskMutation()
    const rows = data?.data ?? []

    const markDone = async (task: Task) => {
        try {
            await updateTask({ task_id: task.task_id, status: 'Done' }).unwrap()
            toast.success('Task completed')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleDelete = async (task: Task) => {
        if (!(await confirmAction('Delete this task?', `"${task.title}" will be removed.`))) return
        try {
            await deleteTask(task.task_id).unwrap()
            toast.success('Task deleted')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <>
            <PageHeader
                title="Tasks"
                subtitle="Follow-ups: payments to chase, approvals to push, documents to collect"
                actions={canCreate(user) && <PrimaryButton icon={<Plus size={16} />} onClick={() => setForm({ open: true })}>New task</PrimaryButton>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <select className="select select-sm w-44 border-gray-300" value={status ?? (showAll ? 'all' : '')} aria-label="Status"
                    onChange={(e) => filters.setFilters({ status: ['', 'all'].includes(e.target.value) ? undefined : e.target.value, all: e.target.value === 'all' })}>
                    <option value="">Open tasks</option>
                    <option value="all">All tasks</option>
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="select select-sm w-48 border-gray-300" value={filters.getNumber('owner_id') ?? ''} aria-label="Assigned to"
                    onChange={(e) => filters.setFilters({ owner_id: e.target.value, mine: undefined })}>
                    <option value="">Everyone</option>
                    {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" className="checkbox checkbox-xs" checked={!!filters.getBool('mine')}
                        onChange={(e) => filters.setFilters({ mine: e.target.checked, owner_id: undefined })} />
                    Mine
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" className="checkbox checkbox-xs" checked={!!filters.getBool('overdue')}
                        onChange={(e) => filters.setFilters({ overdue: e.target.checked })} />
                    Overdue
                </label>
            </div>

            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No tasks here." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr><th>Task</th><th>Assigned to</th><th>Due</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                                {rows.map((task) => {
                                    const editable = canEditOwned(user, task.owner_id)
                                    return (
                                        <tr key={task.task_id} className="hover:bg-gray-50">
                                            <td className="max-w-md">
                                                <p className="font-medium text-gray-900">{task.title}</p>
                                                {task.procurement_id && (
                                                    <Link to={`/procurements/${task.procurement_id}`} className="text-xs text-green-800 hover:underline">{task.procurement_title}</Link>
                                                )}
                                                {task.description && <p className="truncate text-xs text-gray-500">{task.description}</p>}
                                            </td>
                                            <td className="whitespace-nowrap text-sm">{task.owner_name}</td>
                                            <td className={`whitespace-nowrap text-sm ${task.is_overdue ? 'font-semibold text-red-700' : ''}`}>
                                                {formatDate(task.due_date)}{task.is_overdue && ' · overdue'}
                                            </td>
                                            <td><StatusBadge status={task.status} /></td>
                                            <td className="whitespace-nowrap text-right">
                                                {editable && (
                                                    <>
                                                        {task.status !== 'Done' && task.status !== 'Cancelled' && (
                                                            <IconButton label="Mark done" onClick={() => markDone(task)}><CircleCheck size={16} className="text-green-700" /></IconButton>
                                                        )}
                                                        <IconButton label="Edit" onClick={() => setForm({ open: true, task })}><Pencil size={15} /></IconButton>
                                                        <IconButton label="Delete" tone="danger" onClick={() => handleDelete(task)}><Trash2 size={15} /></IconButton>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>

            <TaskFormModal open={form.open} task={form.task} onClose={() => setForm({ open: false })} />
        </>
    )
}

export default Tasks
