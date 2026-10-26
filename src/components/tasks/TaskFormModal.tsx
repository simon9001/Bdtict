import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalId, optionalText } from '../../utils/form'
import { taskApi } from '../../features/api/TaskApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser } from '../../store/hooks'
import { TASK_STATUSES, type Task, type TaskFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { toDateInput } from '../../utils/format'
import { isAdmin } from '../../utils/permissions'

interface TaskFormModalProps {
    open: boolean
    onClose: () => void
    task?: Task              // edit mode
    procurementId?: number   // link a new task to this procurement
}

// Create or edit a follow-up task
const TaskFormModal: React.FC<TaskFormModalProps> = ({ open, onClose, task, procurementId }) => {
    const user = useCurrentUser()
    const { priorities, staff } = useReferenceData()
    const isEdit = !!task

    const [createTask, { isLoading: creating }] = taskApi.useCreateTaskMutation()
    const [updateTask, { isLoading: updating }] = taskApi.useUpdateTaskMutation()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormValues>()

    useEffect(() => {
        if (!open) return
        reset(task ? {
            title: task.title,
            description: task.description,
            owner_id: task.owner_id,
            procurement_id: task.procurement_id,
            priority_id: task.priority_id,
            due_date: toDateInput(task.due_date) || null,
            status: task.status,
        } : { owner_id: user?.user_id, procurement_id: procurementId ?? null, status: 'Open' })
    }, [open, task, procurementId, user, reset])

    const onSubmit: SubmitHandler<TaskFormValues> = async (values) => {
        const body = isAdmin(user) ? values : { ...values, owner_id: undefined }
        try {
            if (isEdit) await updateTask({ task_id: task.task_id, ...body }).unwrap()
            else await createTask(body).unwrap()
            toast.success(isEdit ? 'Task updated' : 'Task created')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit task' : 'New task'} size="md">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <FormField label="Task" required error={errors.title?.message}>
                    <input className={inputClass} placeholder="e.g. Follow up on invoice payment"
                        {...register('title', { required: 'Task is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
                </FormField>

                <FormField label="Details">
                    <textarea rows={3} className={inputClass} {...register('description', { setValueAs: optionalText })} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Due date">
                        <input type="date" className={inputClass} {...register('due_date', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Priority">
                        <select className={inputClass} {...register('priority_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {priorities.map((p) => <option key={p.lookup_id} value={p.lookup_id}>{p.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Status">
                        <select className={inputClass} {...register('status')}>
                            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormField>
                    {isAdmin(user) && (
                        <FormField label="Assigned to">
                            <select className={inputClass} {...register('owner_id', { valueAsNumber: true })}>
                                {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>
                        </FormField>
                    )}
                </div>

                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create task'} />
            </form>
        </Modal>
    )
}

export default TaskFormModal
