import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalText } from '../../utils/form'
import { contractApi } from '../../features/api/ContractApi'
import { procurementApi } from '../../features/api/ProcurementApi'
import { useCurrentUser, useSelectedFy } from '../../store/hooks'
import { CONTRACT_STATUSES, type Contract, type ContractFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { toDateInput } from '../../utils/format'

interface ContractFormModalProps {
    open: boolean
    onClose: () => void
    procurementId?: number   // fixed procurement when opened from its page
    contract?: Pick<Contract, 'contract_id' | 'procurement_id' | 'contract_number' | 'supplier_name' | 'contract_value' | 'start_date' | 'end_date' | 'status' | 'notes'>
    onSaved?: (contractId: number) => void
}

// Create or edit a contract. Extending a contract = changing its end date.
const ContractFormModal: React.FC<ContractFormModalProps> = ({ open, onClose, procurementId, contract, onSaved }) => {
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const isEdit = !!contract
    const needsProcurementPicker = !isEdit && !procurementId

    const [createContract, { isLoading: creating }] = contractApi.useCreateContractMutation()
    const [updateContract, { isLoading: updating }] = contractApi.useUpdateContractMutation()

    // Procurements the user may attach a contract to (own items unless admin)
    const { data: procurementsRes } = procurementApi.useGetProcurementsQuery(
        { fy_id: fyId, limit: 200, mine: user?.role !== 'admin' || undefined },
        { skip: !open || !needsProcurementPicker },
    )

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ContractFormValues>()

    useEffect(() => {
        if (!open) return
        reset(contract ? {
            procurement_id: contract.procurement_id,
            contract_number: contract.contract_number,
            supplier_name: contract.supplier_name,
            contract_value: contract.contract_value,
            start_date: toDateInput(contract.start_date),
            end_date: toDateInput(contract.end_date),
            status: contract.status,
            notes: contract.notes,
        } : { procurement_id: procurementId, status: 'Active' })
    }, [open, contract, procurementId, reset])

    const onSubmit: SubmitHandler<ContractFormValues> = async (values) => {
        try {
            if (isEdit) {
                await updateContract({ contract_id: contract.contract_id, ...values }).unwrap()
                toast.success('Contract updated')
                onSaved?.(contract.contract_id)
            } else {
                const res = await createContract(values).unwrap()
                toast.success('Contract created')
                onSaved?.(res.data.contract_id)
            }
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit contract' : 'New contract'}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {needsProcurementPicker && (
                        <FormField label="Procurement" required error={errors.procurement_id?.message} className="md:col-span-2">
                            <select className={inputClass} {...register('procurement_id', { required: 'Select the procurement', valueAsNumber: true })}>
                                <option value="">Select...</option>
                                {procurementsRes?.data.map((p) => <option key={p.procurement_id} value={p.procurement_id}>{p.title}</option>)}
                            </select>
                        </FormField>
                    )}

                    <FormField label="Contract number" required error={errors.contract_number?.message}>
                        <input className={inputClass} {...register('contract_number', { required: 'Contract number is required' })} />
                    </FormField>

                    <FormField label="Supplier" required error={errors.supplier_name?.message}>
                        <input className={inputClass} {...register('supplier_name', { required: 'Supplier is required' })} />
                    </FormField>

                    <FormField label="Contract value (KES)" required error={errors.contract_value?.message}>
                        <input type="number" step="0.01" min="0" className={inputClass}
                            {...register('contract_value', { required: 'Value is required', valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } })} />
                    </FormField>

                    <FormField label="Status">
                        <select className={inputClass} {...register('status')}>
                            {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Start date" required error={errors.start_date?.message}>
                        <input type="date" className={inputClass} {...register('start_date', { required: 'Start date is required' })} />
                    </FormField>

                    <FormField label="End date" required error={errors.end_date?.message} hint={isEdit ? 'For an extension of time, set the new end date' : undefined}>
                        <input type="date" className={inputClass}
                            {...register('end_date', {
                                required: 'End date is required',
                                validate: (end, all) => !all.start_date || end >= all.start_date || 'End date cannot be before start date',
                            })} />
                    </FormField>

                    <FormField label="Notes" className="md:col-span-2">
                        <textarea rows={3} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                    </FormField>
                </div>
                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create contract'} />
            </form>
        </Modal>
    )
}

export default ContractFormModal
