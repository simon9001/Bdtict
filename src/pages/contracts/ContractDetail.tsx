import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { contractApi } from '../../features/api/ContractApi'
import { useCurrentUser } from '../../store/hooks'
import { canEditOwned } from '../../utils/permissions'
import { confirmAction } from '../../utils/confirm'
import { getErrorMessage } from '../../utils/errors'
import { formatDate, formatMoney } from '../../utils/format'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import ContractFormModal from '../../components/contracts/ContractFormModal'
import InvoiceFormModal from '../../components/invoices/InvoiceFormModal'

/**
 * One contract: value vs invoiced vs paid, the period, and all invoices.
 */
const ContractDetail: React.FC = () => {
    const contractId = Number(useParams().id)
    const navigate = useNavigate()
    const user = useCurrentUser()
    const { data, isLoading, error, refetch } = contractApi.useGetContractByIdQuery(contractId)
    const [deleteContract] = contractApi.useDeleteContractMutation()
    const [modal, setModal] = useState<'edit' | 'invoice' | null>(null)

    if (isLoading) return <LoadingState />
    if (error || !data) return <ErrorState error={error} onRetry={refetch} />

    const c = data.data
    const editable = canEditOwned(user, c.owner_id)
    const invoicedPercent = c.contract_value > 0 ? Math.min(100, (c.invoiced_amount / c.contract_value) * 100) : 0
    const paidPercent = c.contract_value > 0 ? Math.min(100, (c.paid_amount / c.contract_value) * 100) : 0

    const handleDelete = async () => {
        if (!(await confirmAction('Delete this contract?', `Contract ${c.contract_number} will be removed.`))) return
        try {
            await deleteContract(c.contract_id).unwrap()
            toast.success('Contract deleted')
            navigate('/contracts')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <>
            <Link to="/contracts" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-800">
                <ArrowLeft size={16} /> All contracts
            </Link>

            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        <span className="text-sm text-gray-500">{c.contract_number}</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">{c.supplier_name}</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        For <Link className="text-green-800 hover:underline" to={`/procurements/${c.procurement_id}`}>{c.procurement_title}</Link>
                        {' '}· {formatDate(c.start_date)} – {formatDate(c.end_date)}
                        {c.status === 'Active' && ` · ${c.days_to_expiry < 0 ? `ended ${Math.abs(c.days_to_expiry)} days ago` : `${c.days_to_expiry} days left`}`}
                    </p>
                </div>
                {editable && (
                    <div className="flex gap-2">
                        <PrimaryButton icon={<Plus size={16} />} onClick={() => setModal('invoice')}>Record invoice</PrimaryButton>
                        <SecondaryButton icon={<Pencil size={16} />} onClick={() => setModal('edit')}>Edit / extend</SecondaryButton>
                        <SecondaryButton icon={<Trash2 size={16} />} onClick={handleDelete} className="text-red-700">Delete</SecondaryButton>
                    </div>
                )}
            </div>

            {/* Money position */}
            <Card className="mb-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        ['Contract value', formatMoney(c.contract_value)],
                        ['Invoiced', formatMoney(c.invoiced_amount)],
                        ['Paid', formatMoney(c.paid_amount)],
                        ['Balance to pay', formatMoney(c.balance)],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <p className="text-sm text-gray-500">{label}</p>
                            <p className="tabular text-xl font-bold text-gray-900">{value}</p>
                        </div>
                    ))}
                </div>
                {/* Two labelled bars: share invoiced and share paid */}
                <div className="mt-5 space-y-2 text-sm">
                    {[['Invoiced', invoicedPercent, 'bg-orange-500'], ['Paid', paidPercent, 'bg-green-700']].map(([label, percent, color]) => (
                        <div key={label as string} className="flex items-center gap-3">
                            <span className="w-16 text-gray-600">{label}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
                            </div>
                            <span className="tabular w-12 text-right text-gray-700">{Math.round(percent as number)}%</span>
                        </div>
                    ))}
                </div>
                {c.notes && <p className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{c.notes}</p>}
            </Card>

            <Card title="Invoices" padded={false}>
                {c.invoices.length === 0 ? <EmptyState message="No invoices received yet." /> : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Received</th>
                                    <th className="text-right">Amount</th>
                                    <th className="text-right">Paid</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {c.invoices.map((i) => (
                                    <tr key={i.invoice_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/invoices/${i.invoice_id}`)}>
                                        <td className="font-medium text-gray-900">{i.invoice_number}<p className="text-xs font-normal text-gray-500">Dated {formatDate(i.invoice_date)}</p></td>
                                        <td className="text-sm">{formatDate(i.received_date)}</td>
                                        <td className="tabular text-right">{formatMoney(i.amount)}</td>
                                        <td className="tabular text-right">{formatMoney(i.paid_amount)}</td>
                                        <td><StatusBadge status={i.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ContractFormModal open={modal === 'edit'} onClose={() => setModal(null)} contract={c} />
            <InvoiceFormModal open={modal === 'invoice'} onClose={() => setModal(null)} contractId={c.contract_id} />
        </>
    )
}

export default ContractDetail
