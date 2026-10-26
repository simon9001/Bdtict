import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Banknote, CircleCheck, FileSignature, Flag, Hourglass, Receipt, TriangleAlert, Wallet } from 'lucide-react'
import { dashboardApi } from '../features/api/DashboardApi'
import { useCurrentUser, useSelectedFy } from '../store/hooks'
import type { DashboardFilters } from '../types/Types'
import { formatDate, formatMoney, formatMoneyCompact, formatPercent } from '../utils/format'
import StatCard from '../components/common/StatCard'
import Card from '../components/common/Card'
import StatusBadge from '../components/common/StatusBadge'
import { EscalatedBadge, OverdueBadge } from '../components/common/FlagBadges'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import DashboardFilterBar from '../components/common/DashboardFilterBar'
import BudgetByCategoryChart from '../components/charts/BudgetByCategoryChart'
import QuarterlySpendChart from '../components/charts/QuarterlySpendChart'
import PipelineChart from '../components/charts/PipelineChart'
import InvoiceAgeingChart from '../components/charts/InvoiceAgeingChart'

/**
 * Department dashboard - the Head of ICT's main view (everyone can see it).
 * Order follows the questions asked most: overall position -> money -> where
 * work is stuck -> what needs attention today.
 */
const Dashboard: React.FC = () => {
    const user = useCurrentUser()
    const navigate = useNavigate()
    const fyId = useSelectedFy()
    const [extra, setExtra] = useState<{ categoryId?: number; ownerId?: number }>({})

    const filters: DashboardFilters = { fy_id: fyId, category_id: extra.categoryId, owner_id: extra.ownerId }

    const { data: summaryRes, isLoading, error } = dashboardApi.useGetSummaryQuery(filters)
    const { data: attentionRes, isLoading: attentionLoading, error: attentionError } = dashboardApi.useGetAttentionListQuery(filters)
    const { data: expiringRes, isLoading: expiringLoading } = dashboardApi.useGetExpiringContractsQuery({ ...filters, days: 90 })

    const summary = summaryRes?.data
    const fyCode = summaryRes?.financial_year.code

    return (
        <>
            <div className="mb-6 rounded-lg bg-green-800 p-5 text-white">
                <h1 className="text-2xl font-bold">ICT Department Dashboard</h1>
                <p className="mt-1 text-green-100">
                    {fyCode ? `Financial year ${fyCode}` : 'Loading financial year...'} · Welcome, {user?.full_name}
                </p>
            </div>

            <DashboardFilterBar categoryId={extra.categoryId} ownerId={extra.ownerId} onChange={setExtra} />

            {/* KPI tiles */}
            {isLoading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState error={error} />
            ) : summary && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Budget" value={formatMoneyCompact(summary.budget)} hint={formatMoney(summary.budget)} icon={<Wallet size={22} />} accent="blue" />
                    <StatCard label="Contracted" value={formatMoneyCompact(summary.contracted)} hint="Value of contracts awarded" icon={<FileSignature size={22} />} accent="orange" />
                    <StatCard label="Paid" value={formatMoneyCompact(summary.paid)} hint={`${formatPercent(summary.budget_utilisation_percent)} of budget`} icon={<Banknote size={22} />} accent="green" />
                    <StatCard label="Unpaid invoices" value={formatMoneyCompact(summary.outstanding)} hint={`${summary.unpaid_invoices} invoice(s) waiting`} icon={<Receipt size={22} />} accent="purple" onClick={() => navigate('/invoices?unpaid_only=true')} />
                    <StatCard label="Procurements" value={String(summary.procurements.total)} hint={`${summary.procurements.in_progress} in progress · ${summary.procurements.not_started} not started`} icon={<Hourglass size={22} />} accent="gray" onClick={() => navigate('/procurements')} />
                    <StatCard label="Completed" value={String(summary.procurements.completed)} hint={`${formatPercent(summary.completion_rate_percent)} completion rate`} icon={<CircleCheck size={22} />} accent="green" onClick={() => navigate('/procurements?status=Completed')} />
                    <StatCard label="Overdue" value={String(summary.procurements.overdue)} hint="Past the target days for their step" icon={<TriangleAlert size={22} />} accent="red" onClick={() => navigate('/procurements?overdue=true')} />
                    <StatCard label="Escalated" value={String(summary.procurements.escalated)} hint="Open items escalated" icon={<Flag size={22} />} accent="orange" onClick={() => navigate('/procurements?is_escalated=true')} />
                </div>
            )}

            {/* Money */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <BudgetByCategoryChart filters={filters} />
                <QuarterlySpendChart filters={filters} />
            </div>

            {/* Work in progress */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PipelineChart filters={filters} />
                <InvoiceAgeingChart filters={filters} />
            </div>

            {/* Needs attention */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title="Needs attention" className="xl:col-span-2" padded={false}
                    actions={<Link to="/procurements?overdue=true" className="text-sm text-green-800 hover:underline">View all overdue</Link>}>
                    {attentionLoading ? <LoadingState /> : attentionError ? <ErrorState error={attentionError} /> :
                        (attentionRes?.data.length ?? 0) === 0 ? <EmptyState message="Nothing overdue or escalated. 👍" /> : (
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr><th>Procurement</th><th>Owner</th><th>Current step</th><th className="text-right">Days</th><th>Flags</th></tr>
                                    </thead>
                                    <tbody>
                                        {attentionRes?.data.map((item) => (
                                            <tr key={item.procurement_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/procurements/${item.procurement_id}`)}>
                                                <td className="max-w-xs">
                                                    <p className="truncate font-medium text-gray-900">{item.title}</p>
                                                    <p className="text-xs text-gray-500">{item.category}{item.priority ? ` · ${item.priority}` : ''}</p>
                                                </td>
                                                <td className="whitespace-nowrap">{item.owner_name}</td>
                                                <td>{item.current_stage_name ?? <StatusBadge status={item.status} />}</td>
                                                <td className="tabular text-right">{item.days_in_stage ?? '—'}<span className="text-gray-400"> / {item.sla_days ?? '—'}</span></td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.is_overdue && <OverdueBadge days={item.days_in_stage} sla={item.sla_days} />}
                                                        {item.is_escalated && <EscalatedBadge to={item.escalated_to} />}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </Card>

                <Card title="Contracts expiring (90 days)" padded={false}
                    actions={<Link to="/contracts?expiring_within_days=90" className="text-sm text-green-800 hover:underline">View all</Link>}>
                    {expiringLoading ? <LoadingState /> : (expiringRes?.data.length ?? 0) === 0 ? <EmptyState message="No contracts expiring soon." /> : (
                        <ul className="divide-y divide-gray-100">
                            {expiringRes?.data.map((contract) => (
                                <li key={contract.contract_id}>
                                    <Link to={`/contracts/${contract.contract_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-900">{contract.supplier_name}</p>
                                            <p className="truncate text-xs text-gray-500">{contract.contract_number} · ends {formatDate(contract.end_date)}</p>
                                        </div>
                                        <ExpiryChip days={contract.days_to_expiry} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    )
}

// "12 days" chip: red when expired or within 30 days, amber within 60
const ExpiryChip: React.FC<{ days: number }> = ({ days }) => {
    const tone = days < 0 || days <= 30 ? 'bg-red-100 text-red-800' : days <= 60 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
    return (
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`}
        </span>
    )
}

export default Dashboard
