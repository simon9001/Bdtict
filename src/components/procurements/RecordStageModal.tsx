import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalText } from '../../utils/form'
import { procurementApi } from '../../features/api/ProcurementApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { STAGE_EVENT_STATUSES, type StageEventFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { todayInput } from '../../utils/format'

interface RecordStageModalProps {
    open: boolean
    onClose: () => void
    procurementId: number
    currentStageId: number | null  // pre-selects the step the item is at
}

/**
 * Record what happened at a workflow step, e.g. "eGP approval by HOD -
 * Approved - today". Approved/Completed moves the item to the next step.
 */
const RecordStageModal: React.FC<RecordStageModalProps> = ({ open, onClose, procurementId, currentStageId }) => {
    const { stages } = useReferenceData()
    const [recordStage, { isLoading }] = procurementApi.useRecordStageEventMutation()
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<StageEventFormValues>()
    const status = watch('status')

    useEffect(() => {
        if (open) {
            reset({ stage_id: currentStageId ?? stages[0]?.stage_id, status: 'Approved', event_date: todayInput(), notes: null })
        }
    }, [open, currentStageId, stages, reset])

    const onSubmit: SubmitHandler<StageEventFormValues> = async (values) => {
        try {
            await recordStage({ procurement_id: procurementId, ...values }).unwrap()
            toast.success('Step recorded')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    // Group the step list by phase (Memo, eGP, ToR ...) for an easier dropdown
    const groups = stages.reduce<Record<string, typeof stages>>((acc, stage) => {
        (acc[stage.stage_group] ??= []).push(stage)
        return acc
    }, {})

    return (
        <Modal open={open} onClose={onClose} title="Record a step update" size="md">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <FormField label="Step" required error={errors.stage_id?.message}>
                    <select className={inputClass} {...register('stage_id', { required: 'Select a step', valueAsNumber: true })}>
                        {Object.entries(groups).map(([group, groupStages]) => (
                            <optgroup key={group} label={group}>
                                {groupStages.map((stage) => (
                                    <option key={stage.stage_id} value={stage.stage_id}>
                                        {stage.name}{stage.stage_id === currentStageId ? '  (current)' : ''}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Outcome" required>
                        <select className={inputClass} {...register('status', { required: true })}>
                            {STAGE_EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Date" required error={errors.event_date?.message}>
                        <input type="date" max={todayInput()} className={inputClass} {...register('event_date', { required: 'Date is required' })} />
                    </FormField>
                </div>

                <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    {status === 'Approved' || status === 'Completed'
                        ? 'The item will move on to the next step.'
                        : 'The item will stay at this step.'}
                </p>

                <FormField label="Notes">
                    <textarea rows={3} className={inputClass} placeholder="e.g. Approved with minor changes"
                        {...register('notes', { setValueAs: optionalText })} />
                </FormField>

                <FormActions onCancel={onClose} isSaving={isLoading} submitLabel="Record step" />
            </form>
        </Modal>
    )
}

export default RecordStageModal
