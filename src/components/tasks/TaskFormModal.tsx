import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import EscalationFields from '../common/EscalationFields'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalId, optionalText } from '../../utils/form'
import { taskApi } from '../../features/api/TaskApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser } from '../../store/hooks'
import { TASK_STATUSES, taskStatusLabel, type Task, type TaskFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { toDateInput } from '../../utils/format'
import { isAdmin } from '../../utils/permissions'

interface TaskFormModalProps {
    open: boolean
    onClose: () => void
    task?: Task              // edit mode
    procurementId?: number   // link a new task to this procurement
    defaultSectionId?: number // new rows added from a sheet section
}

// Escalated is "Yes" or "No" in the form, as on the sheet
type TaskCardValues = Omit<TaskFormValues, 'is_escalated'> & { is_escalated: string }

// Create or edit a follow-up task
const TaskFormModal: React.FC<TaskFormModalProps> = ({ open, onClose, task, procurementId, defaultSectionId }) => {
    const user = useCurrentUser()
    const { categories, priorities, sections, staff } = useReferenceData()
    const isEdit = !!task

    const [createTask, { isLoading: creating }] = taskApi.useCreateTaskMutation()
    const [updateTask, { isLoading: updating }] = taskApi.useUpdateTaskMutation()
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TaskCardValues>()

    useEffect(() => {
        if (!open) return
        reset(task ? {
            title: task.title,
            description: task.description,
            owner_id: task.owner_id,
            procurement_id: task.procurement_id,
            priority_id: task.priority_id,
            section_id: task.section_id,
            due_date: toDateInput(task.due_date) || null,
            category_id: task.category_id,
            status: task.status,
            is_escalated: task.is_escalated ? 'Yes' : 'No',
            escalated_to: task.escalated_to,
        } : { owner_id: user?.user_id, procurement_id: procurementId ?? null, section_id: defaultSectionId ?? null, status: 'Open', is_escalated: 'No', escalated_to: null })
    }, [open, task, procurementId, user, reset, defaultSectionId])

    const onSubmit: SubmitHandler<TaskCardValues> = async (values) => {
        const escalated = values.is_escalated === 'Yes'
        const fields = { ...values, is_escalated: escalated, escalated_to: escalated ? values.escalated_to : null }
        const body = isAdmin(user) ? fields : { ...fields, owner_id: undefined }
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

                <FormField label="Notes">
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
                    <FormField label="Category">
                        <select className={inputClass} {...register('category_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Tracker section">
                        <select className={inputClass} {...register('section_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {sections.filter((s) => s.value.startsWith('T-')).map((s) => <option key={s.lookup_id} value={s.lookup_id}>{s.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Status">
                        <select className={inputClass} {...register('status')}>
                            {TASK_STATUSES.map((s) => <option key={s} value={s}>{taskStatusLabel(s)}</option>)}
                        </select>
                    </FormField>
                    {isAdmin(user) && (
                        <FormField label="Assigned to">
                            <select className={inputClass} {...register('owner_id', { valueAsNumber: true })}>
                                {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>
                        </FormField>
                    )}
                    <EscalationFields flag={register('is_escalated')} to={register('escalated_to', { setValueAs: optionalText })} escalated={watch('is_escalated') === 'Yes'} current={task?.escalated_to} />
                </div>

                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create task'} />
            </form>
        </Modal>
    )
}

export default TaskFormModal
