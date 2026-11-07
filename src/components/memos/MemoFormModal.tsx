import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import EscalationFields from '../common/EscalationFields'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalId, optionalText } from '../../utils/form'
import { memoApi } from '../../features/api/MemoApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser, useSelectedFy } from '../../store/hooks'
import { DG_STATUSES, PROCUREMENT_STATUSES, type Memo, type MemoFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { toDateInput } from '../../utils/format'
import { isAdmin } from '../../utils/permissions'

interface MemoFormModalProps {
    open: boolean
    onClose: () => void
    memo?: Memo // edit mode
}

// Escalated is "Yes" or "No" in the form, as on the sheet
type MemoCardValues = Omit<MemoFormValues, 'is_escalated'> & { is_escalated: string }

// Create or edit a memo to the DG
const MemoFormModal: React.FC<MemoFormModalProps> = ({ open, onClose, memo }) => {
    const user = useCurrentUser()
    const selectedFy = useSelectedFy()
    const ref = useReferenceData()
    const isEdit = !!memo

    const [createMemo, { isLoading: creating }] = memoApi.useCreateMemoMutation()
    const [updateMemo, { isLoading: updating }] = memoApi.useUpdateMemoMutation()
    const { register, handleSubmit, reset, getValues, watch, formState: { errors } } = useForm<MemoCardValues>()

    useEffect(() => {
        if (!open) return
        reset(memo ? {
            reference: memo.reference,
            title: memo.title,
            fy_id: memo.fy_id,
            owner_id: memo.owner_id,
            category_id: memo.category_id,
            priority_id: memo.priority_id,
            delivered_date: toDateInput(memo.delivered_date) || null,
            approved_date: toDateInput(memo.approved_date) || null,
            dg_status: memo.dg_status,
            status: memo.status,
            notes: memo.notes,
            is_escalated: memo.is_escalated ? 'Yes' : 'No',
            escalated_to: memo.escalated_to,
        } : { fy_id: selectedFy ?? ref.currentYear?.fy_id, owner_id: user?.user_id, status: 'Not Started', is_escalated: 'No', escalated_to: null })
    }, [open, memo, selectedFy, ref.currentYear, user, reset])

    const onSubmit: SubmitHandler<MemoCardValues> = async (values) => {
        const escalated = values.is_escalated === 'Yes'
        const fields = { ...values, is_escalated: escalated, escalated_to: escalated ? values.escalated_to : null }
        const body = isAdmin(user) ? fields : { ...fields, owner_id: undefined }
        try {
            if (isEdit) await updateMemo({ memo_id: memo.memo_id, ...body }).unwrap()
            else await createMemo(body).unwrap()
            toast.success(isEdit ? 'Memo updated' : 'Memo created')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit memo' : 'New memo'} size="lg">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <FormField label="Memo" required error={errors.title?.message}>
                    <input className={inputClass} placeholder="e.g. Memo to procure ICT Equipment"
                        {...register('title', { required: 'Memo title is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
                </FormField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Reference">
                        <input className={inputClass} placeholder="e.g. T-001-15" {...register('reference', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Financial year" required>
                        <select className={inputClass} {...register('fy_id', { valueAsNumber: true })}>
                            {ref.financialYears.map((fy) => <option key={fy.fy_id} value={fy.fy_id}>{fy.code}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Category" required error={errors.category_id?.message}>
                        <select className={inputClass} {...register('category_id', { required: 'Choose a category', valueAsNumber: true })}>
                            <option value="">Select...</option>
                            {ref.categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Priority">
                        <select className={inputClass} {...register('priority_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {ref.priorities.map((p) => <option key={p.lookup_id} value={p.lookup_id}>{p.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Delivered to DG">
                        <input type="date" className={inputClass} {...register('delivered_date', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Approved by DG" error={errors.approved_date?.message}>
                        <input type="date" className={inputClass} {...register('approved_date', {
                            setValueAs: optionalText,
                            validate: (approved) => {
                                const delivered = getValues('delivered_date')
                                return !approved || !delivered || approved >= delivered || 'Cannot be before the delivery date'
                            },
                        })} />
                    </FormField>
                    <FormField label="DG approval status">
                        <select className={inputClass} {...register('dg_status', { setValueAs: optionalText })}>
                            <option value="">—</option>
                            {DG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Memo status">
                        <select className={inputClass} {...register('status')}>
                            {PROCUREMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormField>
                    {isAdmin(user) && (
                        <FormField label="Owner (officer)">
                            <select className={inputClass} {...register('owner_id', { valueAsNumber: true })}>
                                {ref.staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>
                        </FormField>
                    )}
                    <EscalationFields flag={register('is_escalated')} to={register('escalated_to', { setValueAs: optionalText })} escalated={watch('is_escalated') === 'Yes'} current={memo?.escalated_to} />
                </div>

                <FormField label="Notes">
                    <textarea rows={2} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                </FormField>

                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create memo'} />
            </form>
        </Modal>
    )
}

export default MemoFormModal
