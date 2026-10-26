import React from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { budgetLineApi } from '../../features/api/BudgetLineApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import type { Allocation } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { formatMoney } from '../../utils/format'

interface AllocationModalProps {
    open: boolean
    onClose: () => void
    budgetLineId: number
    lineTotal: number           // quantity x unit price
    allocatedElsewhere: number  // planned in OTHER years (to show what is left)
    allocation?: Allocation     // edit an existing year
    usedYearIds: number[]       // years that already have an allocation
}

const QUARTERS = [
    { key: 'q1_amount', label: 'Q1 (Jul–Sep)' },
    { key: 'q2_amount', label: 'Q2 (Oct–Dec)' },
    { key: 'q3_amount', label: 'Q3 (Jan–Mar)' },
    { key: 'q4_amount', label: 'Q4 (Apr–Jun)' },
] as const

/**
 * Planned spend of a budget line for one financial year, optionally split by
 * quarter. Quarters may not add up to more than the year; the years together
 * may not exceed the line total (the API checks both too).
 */
const AllocationModal: React.FC<AllocationModalProps> = (props) => (
    <Modal
        open={props.open}
        onClose={props.onClose}
        title={props.allocation ? `Planned spend · FY ${props.allocation.fy_code}` : 'Add planned spend for a year'}
        size="md"
    >
        {/* The form mounts each time the modal opens, so its defaults are always fresh */}
        <AllocationForm {...props} />
    </Modal>
)

const AllocationForm: React.FC<AllocationModalProps> = ({
    onClose, budgetLineId, lineTotal, allocatedElsewhere, allocation, usedYearIds,
}) => {
    const { financialYears, currentYear } = useReferenceData()
    const [setAllocation, { isLoading }] = budgetLineApi.useSetAllocationMutation()

    const isEdit = !!allocation
    const available = lineTotal - allocatedElsewhere
    const yearChoices = financialYears.filter((fy) => isEdit || !usedYearIds.includes(fy.fy_id))
    const defaultYear = yearChoices.find((fy) => fy.fy_id === currentYear?.fy_id) ?? yearChoices[0]

    const { register, handleSubmit, watch, formState: { errors } } = useForm<Allocation>({
        defaultValues: allocation ?? {
            fy_id: defaultYear?.fy_id,
            planned_amount: Math.max(0, available),
            q1_amount: 0, q2_amount: 0, q3_amount: 0, q4_amount: 0,
        },
    })
    const quarterSum = QUARTERS.reduce((sum, q) => sum + (Number(watch(q.key)) || 0), 0)

    const onSubmit: SubmitHandler<Allocation> = async (values) => {
        try {
            await setAllocation({ budget_line_id: budgetLineId, ...values }).unwrap()
            toast.success('Planned spend saved')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <>
            <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                Line total <strong className="tabular">{formatMoney(lineTotal)}</strong> · planned in other years{' '}
                <strong className="tabular">{formatMoney(allocatedElsewhere)}</strong> · available{' '}
                <strong className="tabular text-green-800">{formatMoney(available)}</strong>
            </p>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Financial year" required>
                        <select className={inputClass} disabled={isEdit} {...register('fy_id', { valueAsNumber: true })}>
                            {yearChoices.map((fy) => <option key={fy.fy_id} value={fy.fy_id}>{fy.code}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Planned for the year (KES)" required error={errors.planned_amount?.message}>
                        <input type="number" step="0.01" min="0" className={inputClass}
                            {...register('planned_amount', {
                                required: 'Amount is required',
                                valueAsNumber: true,
                                min: { value: 0, message: 'Cannot be negative' },
                                max: { value: available, message: `Only ${formatMoney(available)} left on this line` },
                            })} />
                    </FormField>
                </div>

                <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Quarterly plan <span className="font-normal text-gray-500">(optional)</span></p>
                    <div className="grid grid-cols-2 gap-4">
                        {QUARTERS.map((q) => (
                            <FormField key={q.key} label={q.label} error={errors[q.key]?.message}>
                                <input type="number" step="0.01" min="0" className={inputClass}
                                    {...register(q.key, { valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } })} />
                            </FormField>
                        ))}
                    </div>
                    <p className={`mt-2 text-xs ${quarterSum > (Number(watch('planned_amount')) || 0) ? 'text-red-600' : 'text-gray-500'}`}>
                        Quarters add up to {formatMoney(quarterSum)}
                    </p>
                </div>

                <FormActions onCancel={onClose} isSaving={isLoading} submitLabel="Save" />
            </form>
        </>
    )
}

export default AllocationModal
