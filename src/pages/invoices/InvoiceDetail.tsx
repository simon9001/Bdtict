import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Banknote, CircleCheck, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { invoiceApi } from '../../features/api/InvoiceApi'
import { useCurrentUser } from '../../store/hooks'
import { canEditOwned } from '../../utils/permissions'
import { confirmAction } from '../../utils/confirm'
import { getErrorMessage } from '../../utils/errors'
import { formatDate, formatDateTime, formatMoney } from '../../utils/format'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import { IconButton, PrimaryButton, SecondaryButton } from '../../components/common/Buttons'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import InvoiceFormModal from '../../components/invoices/InvoiceFormModal'
import PaymentFormModal from '../../components/invoices/PaymentFormModal'

// The invoice lifecycle shown as steps at the top of the page
const LIFECYCLE = ['Received', 'Verified', 'Approved', 'Paid'] as const

/**
 * One invoice: its lifecycle, one-click "Verify" / "Approve" actions, and
 * the payments made against it.
 */
const InvoiceDetail: React.FC = () => {
    const invoiceId = Number(useParams().id)
    const navigate = useNavigate()
    const user = useCurrentUser()
    const { data, isLoading, error, refetch } = invoiceApi.useGetInvoiceByIdQuery(invoiceId)
    const [updateInvoice, { isLoading: updating }] = invoiceApi.useUpdateInvoiceMutation()
    const [deleteInvoice] = invoiceApi.useDeleteInvoiceMutation()
    const [deletePayment] = invoiceApi.useDeletePaymentMutation()
    const [modal, setModal] = useState<'edit' | 'payment' | null>(null)

    if (isLoading) return <LoadingState />
    if (error || !data) return <ErrorState error={error} onRetry={refetch} />

    const inv = data.data
    const editable = canEditOwned(user, inv.owner_id)
    const stepIndex = LIFECYCLE.indexOf(inv.status as (typeof LIFECYCLE)[number])

    const moveTo = async (status: 'Verified' | 'Approved') => {
        try {
            await updateInvoice({ invoice_id: inv.invoice_id, status }).unwrap()
            toast.success(`Invoice marked ${status}`)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleDelete = async () => {
        if (!(await confirmAction('Delete this invoice?', `Invoice ${inv.invoice_number} will be removed.`))) return
        try {
            await deleteInvoice(inv.invoice_id).unwrap()
            toast.success('Invoice deleted')
            navigate('/invoices')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const handleDeletePayment = async (paymentId: number) => {
        if (!(await confirmAction('Delete this payment?', 'Use this only for a payment entered by mistake.'))) return
        try {
            await deletePayment(paymentId).unwrap()
            toast.success('Payment deleted')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <>
            <Link to="/invoices" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-800">
                <ArrowLeft size={16} /> All invoices
            </Link>

            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <StatusBadge status={inv.status} />
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">Invoice {inv.invoice_number}</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        {inv.supplier_name} · contract{' '}
                        <Link className="text-green-800 hover:underline" to={`/contracts/${inv.contract_id}`}>{inv.contract_number}</Link>
                    </p>
                </div>
                {editable && (
                    <div className="flex flex-wrap gap-2">
                        {inv.status === 'Received' && (
                            <PrimaryButton icon={<ShieldCheck size={16} />} disabled={updating} onClick={() => moveTo('Verified')}>Mark verified</PrimaryButton>
                        )}
                        {inv.status === 'Verified' && (
                            <PrimaryButton icon={<CircleCheck size={16} />} disabled={updating} onClick={() => moveTo('Approved')}>Mark approved</PrimaryButton>
                        )}
                        {inv.status === 'Approved' && inv.balance > 0 && (
                            <PrimaryButton icon={<Banknote size={16} />} onClick={() => setModal('payment')}>Record payment</PrimaryButton>
                        )}
                        <SecondaryButton icon={<Pencil size={16} />} onClick={() => setModal('edit')}>Edit</SecondaryButton>
                        {inv.paid_amount === 0 && (
                            <SecondaryButton icon={<Trash2 size={16} />} onClick={handleDelete} className="text-red-700">Delete</SecondaryButton>
                        )}
                    </div>
                )}
            </div>

            {/* Lifecycle */}
            {inv.status !== 'Rejected' ? (
                <ul className="steps steps-horizontal mb-6 w-full rounded-lg bg-white py-4 shadow-sm">
                    {LIFECYCLE.map((step, i) => (
                        <li key={step} className={`step text-sm ${i <= stepIndex ? 'step-success' : ''}`}>{step}</li>
                    ))}
                </ul>
            ) : (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">This invoice was rejected.</div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title="Details">
                    <dl className="space-y-3 text-sm">
                        {[
                            ['Amount', formatMoney(inv.amount)],
                            ['Paid', formatMoney(inv.paid_amount)],
                            ['Balance', formatMoney(inv.balance)],
                            ['Invoice date', formatDate(inv.invoice_date)],
                            ['Received', formatDate(inv.received_date)],
                            ['Waiting', inv.age_days != null ? `${inv.age_days} days` : '—'],
                            ['Procurement', inv.procurement_title],
                            ['Officer', inv.owner_name],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-4">
                                <dt className="text-gray-500">{label}</dt>
                                <dd className="tabular text-right font-medium text-gray-900">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    {inv.notes && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{inv.notes}</p>}
                </Card>

                <Card title="Payments" className="xl:col-span-2" padded={false}>
                    {inv.payments.length === 0 ? (
                        <EmptyState message={inv.status === 'Approved' ? 'No payments yet.' : 'Payments can be recorded once the invoice is approved.'} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr><th>Date</th><th>Reference</th><th className="text-right">Amount</th><th>Recorded by</th>{editable && <th />}</tr>
                                </thead>
                                <tbody>
                                    {inv.payments.map((pay) => (
                                        <tr key={pay.payment_id}>
                                            <td>{formatDate(pay.payment_date)}</td>
                                            <td>{pay.reference ?? '—'}{pay.notes && <p className="text-xs text-gray-500">{pay.notes}</p>}</td>
                                            <td className="tabular text-right font-medium">{formatMoney(pay.amount)}</td>
                                            <td className="text-sm">{pay.created_by_name}<p className="text-xs text-gray-500">{formatDateTime(pay.created_at)}</p></td>
                                            {editable && (
                                                <td className="text-right">
                                                    <IconButton label="Delete payment" tone="danger" onClick={() => handleDeletePayment(pay.payment_id)}><Trash2 size={15} /></IconButton>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            <InvoiceFormModal open={modal === 'edit'} onClose={() => setModal(null)} invoice={inv} />
            <PaymentFormModal open={modal === 'payment'} onClose={() => setModal(null)} invoice={inv} />
        </>
    )
}

export default InvoiceDetail
