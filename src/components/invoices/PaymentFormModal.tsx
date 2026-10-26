import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalText } from '../../utils/form'
import { invoiceApi } from '../../features/api/InvoiceApi'
import type { Invoice, PaymentFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { formatMoney, todayInput } from '../../utils/format'

interface PaymentFormModalProps {
    open: boolean
    onClose: () => void
    invoice: Pick<Invoice, 'invoice_id' | 'invoice_number' | 'amount' | 'paid_amount' | 'balance'>
}

// Record a (full or part) payment against an approved invoice
const PaymentFormModal: React.FC<PaymentFormModalProps> = ({ open, onClose, invoice }) => {
    const [createPayment, { isLoading }] = invoiceApi.useCreatePaymentMutation()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentFormValues>()

    useEffect(() => {
        if (open) reset({ invoice_id: invoice.invoice_id, amount: invoice.balance, payment_date: todayInput() })
    }, [open, invoice, reset])

    const onSubmit: SubmitHandler<PaymentFormValues> = async (values) => {
        try {
            await createPayment(values).unwrap()
            toast.success(values.amount >= invoice.balance ? 'Payment recorded - invoice fully paid' : 'Part payment recorded')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={`Record payment · invoice ${invoice.invoice_number}`} size="md">
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center text-sm">
                <div><p className="text-gray-500">Invoice</p><p className="tabular font-semibold">{formatMoney(invoice.amount)}</p></div>
                <div><p className="text-gray-500">Paid so far</p><p className="tabular font-semibold">{formatMoney(invoice.paid_amount)}</p></div>
                <div><p className="text-gray-500">Balance</p><p className="tabular font-semibold text-green-800">{formatMoney(invoice.balance)}</p></div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Amount (KES)" required error={errors.amount?.message}>
                        <input type="number" step="0.01" className={inputClass}
                            {...register('amount', {
                                required: 'Amount is required',
                                valueAsNumber: true,
                                min: { value: 0.01, message: 'Must be more than zero' },
                                max: { value: invoice.balance, message: `Cannot exceed the balance (${formatMoney(invoice.balance)})` },
                            })} />
                    </FormField>
                    <FormField label="Payment date" required error={errors.payment_date?.message}>
                        <input type="date" max={todayInput()} className={inputClass} {...register('payment_date', { required: 'Date is required' })} />
                    </FormField>
                </div>
                <FormField label="Payment reference" hint="Payment voucher or EFT number">
                    <input className={inputClass} {...register('reference', { setValueAs: optionalText })} />
                </FormField>
                <FormField label="Notes">
                    <textarea rows={2} className={inputClass} {...register('notes', { setValueAs: optionalText })} />
                </FormField>
                <FormActions onCancel={onClose} isSaving={isLoading} submitLabel="Record payment" />
            </form>
        </Modal>
    )
}

export default PaymentFormModal
