import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalId, optionalText } from '../../utils/form'
import { LoadingState } from '../common/States'
import { budgetLineApi } from '../../features/api/BudgetLineApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser } from '../../store/hooks'
import type { BudgetLine, BudgetLineFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { formatMoney } from '../../utils/format'
import { isAdmin } from '../../utils/permissions'

interface BudgetLineFormModalProps {
    open: boolean
    onClose: () => void
    budgetLine?: BudgetLine   // edit mode
    onSaved?: (budgetLineId: number) => void
}

// Create or edit a budget line (what the department plans to buy)
const BudgetLineFormModal: React.FC<BudgetLineFormModalProps> = ({ open, onClose, budgetLine, onSaved }) => {
    const user = useCurrentUser()
    const ref = useReferenceData()
    const isEdit = !!budgetLine

    const [createLine, { isLoading: creating }] = budgetLineApi.useCreateBudgetLineMutation()
    const [updateLine, { isLoading: updating }] = budgetLineApi.useUpdateBudgetLineMutation()
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<BudgetLineFormValues>()

    // Live total so officers can check against the spreadsheet
    const total = (Number(watch('quantity')) || 0) * (Number(watch('unit_price')) || 0)

    useEffect(() => {
        if (!open) return
        reset(budgetLine ? {
            code: budgetLine.code,
            description: budgetLine.description,
            category_id: budgetLine.category_id,
            priority_id: budgetLine.priority_id,
            owner_id: budgetLine.owner_id,
            quantity: budgetLine.quantity,
            unit_price: budgetLine.unit_price,
            notes: budgetLine.notes,
        } : { quantity: 1, owner_id: user?.user_id })
    }, [open, budgetLine, user, reset])

    const onSubmit: SubmitHandler<BudgetLineFormValues> = async (values) => {
        const body = isAdmin(user) ? values : { ...values, owner_id: undefined }
        try {
            if (isEdit) {
                await updateLine({ budget_line_id: budgetLine.budget_line_id, ...body }).unwrap()
                toast.success('Budget line updated')
                onSaved?.(budgetLine.budget_line_id)
            } else {
                const res = await createLine(body).unwrap()
                toast.success('Budget line created - now add its planned spend per year')
                onSaved?.(res.data.budget_line_id)
            }
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit budget line' : 'New budget line'}>
            {ref.isLoading ? <LoadingState /> : (
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Description" required error={errors.description?.message} className="md:col-span-2">
                            <input className={inputClass} placeholder="e.g. Desktop computers"
                                {...register('description', { required: 'Description is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
                        </FormField>

                        <FormField label="Code" hint="e.g. M-001 (optional)">
                            <input className={inputClass} {...register('code', { setValueAs: optionalText })} />
                        </FormField>

                        <FormField label="Category" required error={errors.category_id?.message}>
                            <select className={inputClass} {...register('category_id', { required: 'Select a category', setValueAs: optionalId })}>
                                <option value="">Select...</option>
                                {ref.categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
                            </select>
                        </FormField>

                        <FormField label="Quantity" required error={errors.quantity?.message}>
                            <input type="number" min="1" className={inputClass}
                                {...register('quantity', { required: 'Quantity is required', valueAsNumber: true, min: { value: 1, message: 'At least 1' } })} />
                        </FormField>

                        <FormField label="Price per unit (KES)" required error={errors.unit_price?.message}>
                            <input type="number" step="0.01" min="0" className={inputClass}
                                {...register('unit_price', { required: 'Price is required', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } })} />
                        </FormField>

                        <div className="md:col-span-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-900">
                            Total: <strong className="tabular">{formatMoney(total)}</strong>
                        </div>

                        <FormField label="Priority">
                            <select className={inputClass} {...register('priority_id', { setValueAs: optionalId })}>
                                <option value="">—</option>
                                {ref.priorities.map((p) => <option key={p.lookup_id} value={p.lookup_id}>{p.value}</option>)}
                            </select>
                        </FormField>

                        {isAdmin(user) && (
                            <FormField label="Officer assigned">
                                <select className={inputClass} {...register('owner_id', { valueAsNumber: true })}>
                                    {ref.staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                                </select>
                            </FormField>
                        )}

                        <FormField label="Notes" className="md:col-span-2">
                            <textarea rows={2} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                        </FormField>
                    </div>
                    <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create budget line'} />
                </form>
            )}
        </Modal>
    )
}

export default BudgetLineFormModal
