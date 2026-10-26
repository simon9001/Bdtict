import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalText } from '../../utils/form'
import { invoiceApi } from '../../features/api/InvoiceApi'
import { contractApi } from '../../features/api/ContractApi'
import { useCurrentUser } from '../../store/hooks'
import { MANUAL_INVOICE_STATUSES, type Invoice, type InvoiceFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { formatMoney, toDateInput, todayInput } from '../../utils/format'

interface InvoiceFormModalProps {
    open: boolean
    onClose: () => void
    contractId?: number       // fixed contract when opened from its page
    invoice?: Invoice         // edit mode
    onSaved?: (invoiceId: number) => void
}

/**
 * Record a supplier invoice, or move it through Received -> Verified ->
 * Approved. "Paid" is set automatically once payments cover the amount.
 */
const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ open, onClose, contractId, invoice, onSaved }) => {
    const user = useCurrentUser()
    const isEdit = !!invoice
    const needsContractPicker = !isEdit && !contractId

    const [createInvoice, { isLoading: creating }] = invoiceApi.useCreateInvoiceMutation()
    const [updateInvoice, { isLoading: updating }] = invoiceApi.useUpdateInvoiceMutation()

    // Active contracts to choose from (own items unless admin)
    const { data: contractsRes } = contractApi.useGetContractsQuery(
        { status: 'Active', limit: 200, owner_id: user?.role === 'admin' ? undefined : user?.user_id },
        { skip: !open || !needsContractPicker },
    )

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<InvoiceFormValues>()
    const selectedContract = contractsRes?.data.find((c) => c.contract_id === Number(watch('contract_id')))

    useEffect(() => {
        if (!open) return
        reset(invoice ? {
            contract_id: invoice.contract_id,
            invoice_number: invoice.invoice_number,
            amount: invoice.amount,
            invoice_date: toDateInput(invoice.invoice_date),
            received_date: toDateInput(invoice.received_date),
            // A paid invoice keeps "Approved" as its manual status
            status: invoice.status === 'Paid' ? 'Approved' : invoice.status,
            notes: invoice.notes,
        } : { contract_id: contractId, received_date: todayInput(), status: 'Received' })
    }, [open, invoice, contractId, reset])

    const onSubmit: SubmitHandler<InvoiceFormValues> = async (values) => {
        try {
            if (isEdit) {
                await updateInvoice({ invoice_id: invoice.invoice_id, ...values }).unwrap()
                toast.success('Invoice updated')
                onSaved?.(invoice.invoice_id)
            } else {
                const res = await createInvoice(values).unwrap()
                toast.success('Invoice recorded')
                onSaved?.(res.data.invoice_id)
            }
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? `Edit invoice ${invoice.invoice_number}` : 'Record an invoice'}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {needsContractPicker && (
                        <FormField label="Contract" required error={errors.contract_id?.message} className="md:col-span-2"
                            hint={selectedContract ? `Value ${formatMoney(selectedContract.contract_value)} · already invoiced ${formatMoney(selectedContract.invoiced_amount)}` : undefined}>
                            <select className={inputClass} {...register('contract_id', { required: 'Select the contract', valueAsNumber: true })}>
                                <option value="">Select...</option>
                                {contractsRes?.data.map((c) => (
                                    <option key={c.contract_id} value={c.contract_id}>{c.contract_number} · {c.supplier_name}</option>
                                ))}
                            </select>
                        </FormField>
                    )}

                    <FormField label="Invoice number" required error={errors.invoice_number?.message}>
                        <input className={inputClass} {...register('invoice_number', { required: 'Invoice number is required' })} />
                    </FormField>

                    <FormField label="Amount (KES)" required error={errors.amount?.message}>
                        <input type="number" step="0.01" min="0" className={inputClass}
                            {...register('amount', { required: 'Amount is required', valueAsNumber: true, min: { value: 0.01, message: 'Must be more than zero' } })} />
                    </FormField>

                    <FormField label="Invoice date" required error={errors.invoice_date?.message}>
                        <input type="date" className={inputClass} {...register('invoice_date', { required: 'Invoice date is required' })} />
                    </FormField>

                    <FormField label="Date received" required error={errors.received_date?.message}>
                        <input type="date" max={todayInput()} className={inputClass} {...register('received_date', { required: 'Date received is required' })} />
                    </FormField>

                    <FormField label="Status" hint="Paid is set automatically when payments cover the invoice">
                        <select className={inputClass} {...register('status')}>
                            {MANUAL_INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Notes" className="md:col-span-2">
                        <textarea rows={2} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                    </FormField>
                </div>
                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Record invoice'} />
            </form>
        </Modal>
    )
}

export default InvoiceFormModal
