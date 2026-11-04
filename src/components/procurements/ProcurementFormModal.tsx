import React, { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { LoadingState } from '../common/States'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalId, optionalText } from '../../utils/form'
import { procurementApi } from '../../features/api/ProcurementApi'
import { budgetLineApi } from '../../features/api/BudgetLineApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser, useSelectedFy } from '../../store/hooks'
import { PROCUREMENT_STATUSES, type Procurement, type ProcurementFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { toDateInput } from '../../utils/format'
import { isAdmin } from '../../utils/permissions'

interface ProcurementFormModalProps {
    open: boolean
    onClose: () => void
    procurement?: Procurement           // edit mode when given
    onSaved?: (procurementId: number) => void
    defaultSectionId?: number           // new rows added from a sheet section
}

// Create or edit a procurement
const ProcurementFormModal: React.FC<ProcurementFormModalProps> = ({ open, onClose, procurement, onSaved, defaultSectionId }) => {
    const user = useCurrentUser()
    const selectedFy = useSelectedFy()
    const ref = useReferenceData()
    const isEdit = !!procurement

    const [createProcurement, { isLoading: creating }] = procurementApi.useCreateProcurementMutation()
    const [updateProcurement, { isLoading: updating }] = procurementApi.useUpdateProcurementMutation()

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProcurementFormValues>()
    const fyId = watch('fy_id')
    const isEscalated = watch('is_escalated')
    const budgetLineId = watch('budget_line_id')

    // Budget lines of the chosen year, to link the procurement to its budget
    const { data: linesRes } = budgetLineApi.useGetBudgetLinesQuery({ fy_id: fyId || undefined, limit: 200 }, { skip: !open })
    const budgetLines = useMemo(() => linesRes?.data ?? [], [linesRes])

    // Fill the form each time it opens
    useEffect(() => {
        if (!open) return
        reset(procurement ? {
            reference: procurement.reference,
            title: procurement.title,
            budget_line_id: procurement.budget_line_id,
            fy_id: procurement.fy_id,
            owner_id: procurement.owner_id,
            category_id: procurement.category_id,
            priority_id: procurement.priority_id,
            section_id: procurement.section_id,
            acquisition_method_id: procurement.acquisition_method_id,
            scm_officer_id: procurement.scm_officer_id,
            status: procurement.status,
            tender_float_date: toDateInput(procurement.tender_float_date) || null,
            tender_opening_date: toDateInput(procurement.tender_opening_date) || null,
            is_escalated: procurement.is_escalated,
            escalated_to: procurement.escalated_to,
            escalation_note: procurement.escalation_note,
            notes: procurement.notes,
        } : {
            fy_id: selectedFy ?? ref.currentYear?.fy_id,
            owner_id: user?.user_id,
            status: 'Not Started',
            is_escalated: false,
            section_id: defaultSectionId ?? null,
        })
    }, [open, procurement, reset, selectedFy, ref.currentYear, user, defaultSectionId])

    // Budget lines arrive after the form is filled: re-apply the saved choice so the select shows it
    useEffect(() => {
        if (isEdit && linesRes) setValue('budget_line_id', procurement.budget_line_id)
    }, [isEdit, linesRes, procurement, setValue])

    // Picking a budget line pre-fills the category
    useEffect(() => {
        const line = budgetLines.find((l) => l.budget_line_id === budgetLineId)
        if (line && !isEdit) setValue('category_id', line.category_id)
    }, [budgetLineId, budgetLines, isEdit, setValue])

    const onSubmit: SubmitHandler<ProcurementFormValues> = async (values) => {
        // Only the Head of ICT may set the owner
        const body = isAdmin(user) ? values : { ...values, owner_id: undefined }
        try {
            if (isEdit) {
                await updateProcurement({ procurement_id: procurement.procurement_id, ...body }).unwrap()
                toast.success('Procurement updated')
                onSaved?.(procurement.procurement_id)
            } else {
                const res = await createProcurement(body).unwrap()
                toast.success('Procurement created')
                onSaved?.(res.data.procurement_id)
            }
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit procurement' : 'New procurement'} size="xl">
            {ref.isLoading ? <LoadingState /> : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Title / activity" required error={errors.title?.message} className="md:col-span-2">
                        <input className={inputClass} placeholder="e.g. Procurement of laptop computers"
                            {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
                    </FormField>

                    <FormField label="Reference" hint="Tender / memo number, if any">
                        <input className={inputClass} {...register('reference', { setValueAs: optionalText })} />
                    </FormField>

                    <FormField label="Financial year" required error={errors.fy_id?.message}>
                        <select className={inputClass} {...register('fy_id', { required: 'Select a financial year', valueAsNumber: true })}>
                            {ref.financialYears.map((fy) => <option key={fy.fy_id} value={fy.fy_id}>{fy.code}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Budget line" hint="Links spend to the planned budget" className="md:col-span-2">
                        <select className={inputClass} {...register('budget_line_id', { setValueAs: optionalId })}>
                            <option value="">— Not linked —</option>
                            {budgetLines.map((line) => (
                                <option key={line.budget_line_id} value={line.budget_line_id}>
                                    {line.code ? `${line.code} · ` : ''}{line.description}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Category" required error={errors.category_id?.message}>
                        <select className={inputClass} {...register('category_id', { required: 'Select a category', setValueAs: optionalId })}>
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

                    <FormField label="Acquisition method">
                        <select className={inputClass} {...register('acquisition_method_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {ref.acquisitionMethods.map((m) => <option key={m.lookup_id} value={m.lookup_id}>{m.value}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Tracker section">
                        <select className={inputClass} {...register('section_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {ref.sections.map((s) => <option key={s.lookup_id} value={s.lookup_id}>{s.value}</option>)}
                        </select>
                    </FormField>

                    <FormField label="SCM officer">
                        <select className={inputClass} {...register('scm_officer_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {ref.scmOfficers.map((s) => <option key={s.lookup_id} value={s.lookup_id}>{s.value}</option>)}
                        </select>
                    </FormField>

                    {isAdmin(user) && (
                        <FormField label="Owner (officer)">
                            <select className={inputClass} {...register('owner_id', { valueAsNumber: true })}>
                                {ref.staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>
                        </FormField>
                    )}

                    {isEdit && (
                        <FormField label="Status" hint="Steps update this automatically; change it by hand for On Hold / Cancelled">
                            <select className={inputClass} {...register('status')}>
                                {PROCUREMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </FormField>
                    )}

                    <FormField label="Quotation / tender float date">
                        <input type="date" className={inputClass} {...register('tender_float_date', { setValueAs: optionalText })} />
                    </FormField>

                    <FormField label="Quotation / tender opening date">
                        <input type="date" className={inputClass} {...register('tender_opening_date', { setValueAs: optionalText })} />
                    </FormField>

                    <div className="md:col-span-2 rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                            <input type="checkbox" className="checkbox checkbox-sm" {...register('is_escalated')} />
                            This item has been escalated
                        </label>
                        {isEscalated && (
                            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField label="Escalated to">
                                    <input className={inputClass} placeholder="e.g. Director General" {...register('escalated_to', { setValueAs: optionalText })} />
                                </FormField>
                                <FormField label="Reason">
                                    <input className={inputClass} {...register('escalation_note', { setValueAs: optionalText })} />
                                </FormField>
                            </div>
                        )}
                    </div>

                    <FormField label="Notes" className="md:col-span-2">
                        <textarea rows={3} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                    </FormField>
                </div>

                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create procurement'} />
            </form>
            )}
        </Modal>
    )
}

export default ProcurementFormModal
