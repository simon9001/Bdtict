import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import EscalationFields from '../common/EscalationFields'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { budgetLineApi } from '../../features/api/BudgetLineApi'
import { procurementApi } from '../../features/api/ProcurementApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useCurrentUser } from '../../store/hooks'
import {
    PROCUREMENT_STATUSES, STAGE_EVENT_STATUSES,
    type ProcurementFormValues, type ProcurementStatus, type StageEventStatus,
    type TrackerBudgetLine, type TrackerData, type TrackerProcurement,
} from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { optionalId, optionalText } from '../../utils/form'
import { formatMoney, todayInput, toDateInput } from '../../utils/format'
import { isAdmin } from '../../utils/permissions'
import { MEMO_STAGE_HEADERS, STEP_HEADERS, TENDER_STAGES } from '../../utils/sheetColumns'

/**
 * The card that adds or edits one row of a sheet. It holds every column of the
 * row, in the sheet's order, and when editing each one starts with its current
 * value, so people can see what is there before changing it.
 *
 * The years of a budget row must add up to its Total Sum, so the row always
 * balances. Expenditure Q1 to Q4 are what was actually paid, so they come from the
 * payments recorded and are only shown here.
 *
 * A budget sheet row is a budget line plus the procurement that tracks it; an
 * All list follow-up is a procurement on its own. Total Sum, No of Days and
 * % Complete are worked out, so they are shown but cannot be typed over.
 */

interface SheetRowCardProps {
    open: boolean
    onClose: () => void
    kind: 'budget' | 'procurement'
    data: TrackerData
    fyId: number
    sectionId?: number              // the section a new row goes into
    line?: TrackerBudgetLine        // editing a budget sheet row
    item?: TrackerProcurement       // editing, or the procurement of that budget row
}

interface CardValues {
    reference: string | null
    title: string
    category_id: number
    priority_id: number | null
    section_id: number | null
    owner_id: number
    status: ProcurementStatus
    quantity: number
    unit_price: number
    plan: Record<string, string>     // one amount per financial year, keyed "fy<id>"
    steps: Record<string, { status: string; date: string }>
    scm_officer_id: number | null
    acquisition_method_id: number | null
    tender_float_date: string | null
    tender_opening_date: string | null
    is_escalated: string             // "Yes" or "No", as on the sheet
    escalated_to: string | null
    escalation_note: string | null
    notes: string | null
}

const QUARTERS = ['q1_actual', 'q2_actual', 'q3_actual', 'q4_actual'] as const

const amountOf = (value: string | undefined) => Number(value || 0)
const amountText = (value: number | undefined) => (value ? String(value) : '')

// A heading between the groups of fields
const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <fieldset className="border-t border-gray-200 pt-4">
        <legend className="pr-2 text-sm font-semibold text-gray-900">{title}</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
)

const SheetRowCard: React.FC<SheetRowCardProps> = ({ open, onClose, kind, data, fyId, sectionId, line, item }) => {
    const user = useCurrentUser()
    const ref = useReferenceData()
    const isBudget = kind === 'budget'
    const isEdit = isBudget ? !!line : !!item

    const [createLine] = budgetLineApi.useCreateBudgetLineMutation()
    const [updateLine] = budgetLineApi.useUpdateBudgetLineMutation()
    const [patchAllocation] = budgetLineApi.usePatchAllocationMutation()
    const [createProcurement] = procurementApi.useCreateProcurementMutation()
    const [updateProcurement] = procurementApi.useUpdateProcurementMutation()
    const [recordStep] = procurementApi.useRecordStageEventMutation()
    const [correctStep] = procurementApi.useCorrectStageEventMutation()
    const [deleteStep] = procurementApi.useDeleteStageEventMutation()

    const { register, handleSubmit, reset, watch, getValues, formState: { errors, isSubmitting } } = useForm<CardValues>()

    // Years with a plan on any line, and always the year being viewed
    const years = data.financial_years.filter((fy) => fy.fy_id === fyId || data.budget_lines.some((l) => l.allocations.some((a) => a.fy_id === fy.fy_id)))
    const paidThisYear = line?.actuals.find((a) => a.fy_id === fyId)
    const steps = data.stages.filter((s) => !TENDER_STAGES.includes(s.code))

    // Every field starts with what is stored, each time the card opens
    useEffect(() => {
        if (!open) return
        reset({
            reference: (isBudget ? line?.code : item?.reference) ?? null,
            title: (isBudget ? line?.description : item?.title) ?? '',
            category_id: (isBudget ? line?.category_id : item?.category_id) ?? undefined,
            priority_id: (isBudget ? line?.priority_id : item?.priority_id) ?? null,
            section_id: (isBudget ? line?.section_id : item?.section_id) ?? sectionId ?? null,
            owner_id: (isBudget ? line?.owner_id : item?.owner_id) ?? user?.user_id,
            status: item?.status ?? 'Not Started',
            quantity: line?.quantity ?? 1,
            unit_price: line?.unit_price ?? 0,
            plan: Object.fromEntries(years.map((fy) => [`fy${fy.fy_id}`, amountText(line?.allocations.find((a) => a.fy_id === fy.fy_id)?.planned_amount)])),
            steps: Object.fromEntries(steps.map((s) => [s.code, {
                status: item?.steps[s.code]?.status ?? '',
                date: item?.steps[s.code]?.date_known ? toDateInput(item.steps[s.code]?.event_date) : '',
            }])),
            scm_officer_id: item?.scm_officer_id ?? null,
            acquisition_method_id: item?.acquisition_method_id ?? null,
            tender_float_date: toDateInput(item?.tender_float_date ?? item?.steps.TENDER_FLOATED?.event_date) || null,
            tender_opening_date: toDateInput(item?.tender_opening_date ?? item?.steps.TENDER_OPENED?.event_date) || null,
            is_escalated: item?.is_escalated ? 'Yes' : 'No',
            escalated_to: item?.escalated_to ?? null,
            escalation_note: item?.escalation_note ?? null,
            notes: item?.notes ?? null,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, line, item, sectionId])

    // Worked-out figures, kept up to date as people type
    const total = (Number(watch('quantity')) || 0) * (Number(watch('unit_price')) || 0)
    const float = watch('tender_float_date')
    const opening = watch('tender_opening_date')
    const tenderDays = float && opening ? Math.round((new Date(opening).getTime() - new Date(float).getTime()) / 86400000) : null
    const escalated = watch('is_escalated') === 'Yes'

    // Saves each year's plan, only when it changed
    const saveYearPlans = async (budgetLineId: number, source: TrackerBudgetLine | undefined, values: CardValues) => {
        for (const fy of years) {
            const stored = source?.allocations.find((a) => a.fy_id === fy.fy_id)
            const planned = amountOf(values.plan[`fy${fy.fy_id}`])
            if (planned !== (stored?.planned_amount ?? 0)) await patchAllocation({ budget_line_id: budgetLineId, fy_id: fy.fy_id, planned_amount: planned }).unwrap()
        }
    }

    // A new outcome adds to the procurement's history and a different date corrects the
    // update shown in the cell. A step set back to blank removes its latest update.
    const saveSteps = async (procurementId: number, values: CardValues) => {
        for (const stage of steps) {
            const stored = item?.steps[stage.code]
            const { status, date } = values.steps[stage.code] ?? { status: '', date: '' }
            if (!status) {
                if (stored) await deleteStep({ procurement_id: procurementId, event_id: stored.event_id }).unwrap()
                continue
            }
            const storedDate = stored?.date_known ? toDateInput(stored.event_date) : ''
            if (stored && date && date !== storedDate) {
                await correctStep({ procurement_id: procurementId, event_id: stored.event_id, status: status as StageEventStatus, event_date: date }).unwrap()
            } else if (status !== stored?.status) {
                await recordStep({ procurement_id: procurementId, stage_id: stage.stage_id, status: status as StageEventStatus, event_date: date || todayInput() }).unwrap()
            }
        }
        // A tender date also marks its step as done, and clearing the date undoes that
        for (const [code, date] of [['TENDER_FLOATED', values.tender_float_date], ['TENDER_OPENED', values.tender_opening_date]] as const) {
            const stage = data.stages.find((s) => s.code === code)
            const stored = item?.steps[code]
            if (!date) {
                if (stored) await deleteStep({ procurement_id: procurementId, event_id: stored.event_id }).unwrap()
            } else if (stored) {
                if (date !== toDateInput(stored.event_date)) await correctStep({ procurement_id: procurementId, event_id: stored.event_id, status: 'Completed', event_date: date }).unwrap()
            } else if (stage) {
                await recordStep({ procurement_id: procurementId, stage_id: stage.stage_id, status: 'Completed', event_date: date }).unwrap()
            }
        }
    }

    const onSubmit: SubmitHandler<CardValues> = async (values) => {
        const owner = isAdmin(user) ? { owner_id: Number(values.owner_id) } : {}
        const procurementFields: Partial<ProcurementFormValues> = {
            reference: values.reference,
            title: values.title,
            category_id: Number(values.category_id),
            priority_id: values.priority_id,
            section_id: values.section_id,
            acquisition_method_id: values.acquisition_method_id,
            scm_officer_id: values.scm_officer_id,
            tender_float_date: values.tender_float_date,
            tender_opening_date: values.tender_opening_date,
            is_escalated: values.is_escalated === 'Yes',
            escalated_to: values.is_escalated === 'Yes' ? values.escalated_to : null,
            escalation_note: values.is_escalated === 'Yes' ? values.escalation_note : null,
            notes: values.notes,
            ...owner,
        }
        try {
            let budgetLineId = line?.budget_line_id ?? null

            if (isBudget) {
                const lineFields = {
                    code: values.reference,
                    description: values.title,
                    category_id: Number(values.category_id),
                    priority_id: values.priority_id,
                    section_id: values.section_id,
                    quantity: Number(values.quantity),
                    unit_price: Number(values.unit_price),
                    ...owner,
                }
                if (line) {
                    // A smaller total must make room first: the plan has to fit inside it
                    const shrinking = total < line.total_amount
                    if (shrinking) await saveYearPlans(line.budget_line_id, line, values)
                    await updateLine({ budget_line_id: line.budget_line_id, ...lineFields }).unwrap()
                    if (!shrinking) await saveYearPlans(line.budget_line_id, line, values)
                } else {
                    const created = await createLine(lineFields).unwrap()
                    budgetLineId = created.data.budget_line_id
                    await saveYearPlans(budgetLineId, undefined, values)
                }
            }

            let procurementId = item?.procurement_id
            if (procurementId) {
                await updateProcurement({ procurement_id: procurementId, ...procurementFields, ...(isBudget ? {} : { status: values.status }) }).unwrap()
            } else {
                const created = await createProcurement({
                    ...procurementFields,
                    title: values.title,
                    category_id: Number(values.category_id),
                    budget_line_id: budgetLineId,
                    fy_id: fyId,
                    status: values.status,
                    is_escalated: values.is_escalated === 'Yes',
                }).unwrap()
                procurementId = created.data.procurement_id
            }
            await saveSteps(procurementId, values)

            toast.success(isEdit ? 'Changes saved' : 'Row added')
            onClose()
        } catch (error) {
            // Parts saved before the error stay saved; the card stays open to fix the rest
            toast.error(getErrorMessage(error))
        }
    }

    const stepLabel = (code: string, name: string) => (isBudget ? STEP_HEADERS[code] ?? name : MEMO_STAGE_HEADERS[code] ?? STEP_HEADERS[code] ?? name)
    const titleText = isBudget ? (isEdit ? 'Edit budget line' : 'Add budget line') : (isEdit ? 'Edit activity' : 'Add activity')
    const sections = ref.sections.filter((s) => (isBudget ? !s.value.startsWith('T-') : s.value.startsWith('T-')))

    return (
        <Modal open={open} onClose={onClose} title={titleText} size="xl">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <Group title="Details">
                    <FormField label={isBudget ? 'Category ID' : 'Task ID'}>
                        <input className={inputClass} {...register('reference', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Tracker section">
                        <select className={inputClass} {...register('section_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {sections.map((s) => <option key={s.lookup_id} value={s.lookup_id}>{s.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label={isBudget ? 'Asset Description' : 'Task Name / Activity'} required error={errors.title?.message} className="md:col-span-2">
                        <textarea rows={2} className={inputClass} {...register('title', { required: 'This is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
                    </FormField>
                    <FormField label="Category" required error={errors.category_id?.message}>
                        <select className={inputClass} {...register('category_id', { required: 'Choose a category' })}>
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
                    {isAdmin(user) ? (
                        <FormField label={isBudget ? 'Officer Assigned' : 'Owner'}>
                            <select className={inputClass} {...register('owner_id')}>
                                {ref.staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>
                        </FormField>
                    ) : (
                        <FormField label={isBudget ? 'Officer Assigned' : 'Owner'} hint="Only the Head of ICT can change this">
                            <input className={inputClass} disabled value={(isBudget ? line?.owner_name : item?.owner_name) ?? user?.full_name ?? ''} readOnly />
                        </FormField>
                    )}
                    {!isBudget && (
                        <FormField label="Memo Status">
                            <select className={inputClass} {...register('status')}>
                                {PROCUREMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </FormField>
                    )}
                </Group>

                {isBudget && (
                    <Group title="Cost and plan">
                        <FormField label="Quantity" required error={errors.quantity?.message}>
                            <input type="number" min={1} className={inputClass} {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'At least 1' } })} />
                        </FormField>
                        <FormField label="Price per unit" required error={errors.unit_price?.message}>
                            <input type="number" min={0} step="0.01" className={inputClass} {...register('unit_price', { required: 'Price is required', min: { value: 0, message: 'Cannot be negative' } })} />
                        </FormField>
                        <FormField label="Total Sum" hint="Worked out: quantity x price" className="md:col-span-2">
                            <p className="tabular py-2 text-sm font-semibold text-gray-900">{formatMoney(total)}</p>
                        </FormField>
                        {years.map((fy) => (
                            <FormField key={fy.fy_id} label={`Expenditure FY ${fy.code.slice(2)}`} error={errors.plan?.[`fy${fy.fy_id}`]?.message}>
                                <input type="number" min={0} step="0.01" className={inputClass} {...register(`plan.fy${fy.fy_id}`, {
                                    validate: () => {
                                        const planned = years.reduce((sum, y) => sum + amountOf(getValues(`plan.fy${y.fy_id}`)), 0)
                                        return Math.round(planned * 100) === Math.round(total * 100) || `The years add up to ${formatMoney(planned)}, but must equal the Total Sum`
                                    },
                                })} />
                            </FormField>
                        ))}
                        {QUARTERS.map((q, index) => (
                            <FormField key={q} label={`Expenditure Q${index + 1}`} hint="Worked out from the payments recorded">
                                <p className="tabular py-2 text-sm font-semibold text-gray-900">{formatMoney(paidThisYear?.[q] ?? 0)}</p>
                            </FormField>
                        ))}
                    </Group>
                )}

                <Group title="Process">
                    {steps.map((stage) => (
                        <FormField key={stage.code} label={stepLabel(stage.code, stage.name)}>
                            <div className="grid grid-cols-2 gap-2">
                                <select className={inputClass} aria-label={`${stage.name} status`} {...register(`steps.${stage.code}.status`)}>
                                    <option value="">Not done</option>
                                    {STAGE_EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <input type="date" className={inputClass} aria-label={`${stage.name} date`} {...register(`steps.${stage.code}.date`)} />
                            </div>
                        </FormField>
                    ))}
                    <FormField label="SCM Officer Allocated">
                        <select className={inputClass} {...register('scm_officer_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {ref.scmOfficers.map((s) => <option key={s.lookup_id} value={s.lookup_id}>{s.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Acquisition method">
                        <select className={inputClass} {...register('acquisition_method_id', { setValueAs: optionalId })}>
                            <option value="">—</option>
                            {ref.acquisitionMethods.map((m) => <option key={m.lookup_id} value={m.lookup_id}>{m.value}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Quotation/Tender Float Date">
                        <input type="date" className={inputClass} {...register('tender_float_date', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Tender/Quotation Opening Date" error={errors.tender_opening_date?.message}>
                        <input type="date" className={inputClass} {...register('tender_opening_date', {
                            setValueAs: optionalText,
                            validate: (value) => {
                                const from = getValues('tender_float_date')
                                return !value || !from || value >= from || 'Cannot be before the float date'
                            },
                        })} />
                    </FormField>
                    <FormField label="Quotation/Tender No of Days" hint="Worked out from the two dates">
                        <p className="tabular py-2 text-sm font-semibold text-gray-900">{tenderDays ?? '—'}</p>
                    </FormField>
                    <FormField label="% Complete" hint="Worked out from the steps">
                        <p className="tabular py-2 text-sm font-semibold text-gray-900">{item ? `${item.progress_percent ?? 0}%` : '—'}</p>
                    </FormField>
                </Group>

                <Group title="Escalation and notes">
                    <EscalationFields flag={register('is_escalated')} to={register('escalated_to', { setValueAs: optionalText })} escalated={escalated} current={item?.escalated_to} />
                    <FormField label="Escalation note" className="md:col-span-2">
                        <input className={inputClass} disabled={!escalated} {...register('escalation_note', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Notes" className="md:col-span-2">
                        <textarea rows={3} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                    </FormField>
                </Group>

                <FormActions onCancel={onClose} isSaving={isSubmitting} submitLabel={isEdit ? 'Save changes' : 'Add row'} />
            </form>
        </Modal>
    )
}

export default SheetRowCard
