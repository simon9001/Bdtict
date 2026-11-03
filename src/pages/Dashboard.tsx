import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Banknote, ChevronRight, FilePlus2, FileSignature, Flag, Receipt, TriangleAlert, type LucideIcon } from 'lucide-react'
import { dashboardApi } from '../features/api/DashboardApi'
import { useIsSmallScreen } from '../hooks/useMediaQuery'
import { useCurrentUser, useSelectedFy } from '../store/hooks'
import type { DashboardFilters, NamedCount } from '../types/Types'
import { formatDate, formatMoney, formatMoneyCompact, formatNumber, formatPercent } from '../utils/format'
import { drillContext, drillTo, drillWithoutYear, type DrillContext } from '../utils/drill'
import { canCreate } from '../utils/permissions'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import RenderWhenNear from '../components/common/RenderWhenNear'
import StatusBadge from '../components/common/StatusBadge'
import { EscalatedBadge, OverdueBadge } from '../components/common/FlagBadges'
import { EmptyState, ErrorState, LoadingState } from '../components/common/States'
import DashboardFilterBar from '../components/common/DashboardFilterBar'
import BudgetByCategoryChart from '../components/charts/BudgetByCategoryChart'
import ChartCard, { type TableColumn } from '../components/charts/ChartCard'
import DonutChart, { type DonutSlice } from '../components/charts/DonutChart'
import InvoiceAgeingChart from '../components/charts/InvoiceAgeingChart'
import OfficerWorkloadChart from '../components/charts/OfficerWorkloadChart'
import PipelineChart from '../components/charts/PipelineChart'
import QuarterlySpendChart from '../components/charts/QuarterlySpendChart'
import SpendTrendPanel from '../components/charts/SpendTrendPanel'
import TopBudgetLinesChart from '../components/charts/TopBudgetLinesChart'
import YearComparisonChart from '../components/charts/YearComparisonChart'
import { CATEGORICAL, CHROME, ORDINAL_BLUE, STATUS_COLORS } from '../components/charts/chartTheme'

/**
 * Department dashboard - the Head of ICT's main view (everyone can see it).
 * Top to bottom: where things stand -> the money -> where work sits and how it
 * splits -> who is doing it -> what needs attention and what changed last.
 * Parts with no data yet stay on the page and say so.
 */

// A small figure with an icon. Red and orange are only used for problems.
const TONES = {
    neutral: 'bg-green-100 text-green-800',
    good: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700',
}

const Tile: React.FC<{ label: string; value: string; hint?: string; icon: LucideIcon; tone?: keyof typeof TONES; onClick?: () => void }> = ({
    label, value, hint, icon: Icon, tone = 'neutral', onClick,
}) => {
    const Wrapper = onClick ? 'button' : 'div'
    return (
        <Wrapper onClick={onClick} className={`w-full rounded-lg bg-white p-4 text-left shadow-sm ${onClick ? 'cursor-pointer transition hover:shadow-md' : ''}`}>
            <span className={`mb-2 inline-flex rounded-lg p-2 ${TONES[tone]}`}><Icon size={18} aria-hidden /></span>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="tabular truncate text-2xl font-bold text-gray-900">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
        </Wrapper>
    )
}

const MiniFigure: React.FC<{ label: string; value: string; hint?: string; to: string }> = ({ label, value, hint, to }) => (
    <Link to={to} className="block rounded-lg bg-gray-50 p-3 transition hover:bg-gray-100">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="tabular text-xl font-bold text-gray-900">{value}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </Link>
)

// Table view shared by the status / priority / method pies
const openSlice = (row: DonutSlice) => (row.value > 0 ? row.href : undefined)

const COUNT_COLUMNS: TableColumn<DonutSlice>[] = [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Count', align: 'right' },
]

const DonutCard: React.FC<{ title: string; subtitle: string; slices: DonutSlice[]; centerLabel: string; isLoading: boolean; error: unknown }> = ({
    title, subtitle, slices, centerLabel, isLoading, error,
}) => (
    <ChartCard title={title} subtitle={subtitle} isLoading={isLoading} error={error} rows={slices} columns={COUNT_COLUMNS} rowLink={openSlice}>
        <DonutChart slices={slices} centerLabel={centerLabel} />
    </ChartCard>
)

// Each builder takes the link for one row of its chart
type RowLink = (row: NamedCount) => string

const withStatusColors = (rows: NamedCount[] = [], link: RowLink): DonutSlice[] =>
    rows.map((row) => ({ ...row, color: STATUS_COLORS[row.name] ?? CHROME.tick, href: link(row) }))

// Ordered lists use the blue ramp; "Not set" stays gray
const withOrdinalColors = (rows: NamedCount[] = [], link: RowLink): DonutSlice[] =>
    rows.map((row, i) => ({ ...row, color: row.name === 'Not set' ? CHROME.tick : ORDINAL_BLUE[i] ?? ORDINAL_BLUE[3], href: link(row) }))

const withCategoricalColors = (rows: NamedCount[] = [], link: RowLink): DonutSlice[] =>
    rows.map((row, i) => ({ ...row, color: row.name === 'Not set' ? CHROME.tick : CATEGORICAL[i] ?? CHROME.tick, href: link(row) }))

const PHASES = ['Memo', 'eGP', 'ToR', 'Tender', 'ERP', 'Contract', 'Delivery', 'Closed']

// How many "needs attention" rows the dashboard shows before "view all"
const ATTENTION_ROWS = 8

// A titled group of charts. Closed at first on phones to keep the page short.
const ChartSection: React.FC<{ title: string; className: string; children: React.ReactNode }> = ({ title, className, children }) => {
    const small = useIsSmallScreen()
    return (
        <details open={!small} className="group mb-6">
            <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600 [&::-webkit-details-marker]:hidden">
                <ChevronRight size={16} className="transition-transform group-open:rotate-90" aria-hidden />
                {title}
            </summary>
            <div className={className}>
                {React.Children.map(children, (child) => <RenderWhenNear>{child}</RenderWhenNear>)}
            </div>
        </details>
    )
}

// One labelled bar per status, with its count
const StatusBars: React.FC<{ rows: NamedCount[]; linkOf: (name: string) => string; colorOf?: (name: string) => string }> = ({ rows, linkOf, colorOf = (name) => STATUS_COLORS[name] ?? CHROME.tick }) => {
    const highest = Math.max(1, ...rows.map((row) => row.value))
    return (
        <ul className="space-y-1.5">
            {rows.map((row) => (
                <li key={row.name} className="text-xs">
                    {React.createElement(row.value > 0 ? Link : 'div', {
                        ...(row.value > 0 ? { to: linkOf(row.name) } : {}),
                        className: `-mx-1 flex items-center gap-2 rounded px-1 ${row.value > 0 ? 'hover:bg-gray-100' : ''}`,
                    } as React.ComponentProps<typeof Link>, (
                        <>
                            <span className="w-20 shrink-0 text-gray-600">{row.name}</span>
                            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                                <span className="block h-full rounded-full" style={{ width: `${(row.value / highest) * 100}%`, background: colorOf(row.name) }} />
                            </span>
                            <span className="tabular w-6 text-right font-medium text-gray-900">{row.value}</span>
                        </>
                    ))}
                </li>
            ))}
        </ul>
    )
}

const Dashboard: React.FC = () => {
    const user = useCurrentUser()
    const navigate = useNavigate()
    const fyId = useSelectedFy()
    const [extra, setExtra] = useState<{ categoryId?: number; ownerId?: number }>({})

    const filters: DashboardFilters = { fy_id: fyId, category_id: extra.categoryId, owner_id: extra.ownerId }

    const { data: summaryRes, isLoading, error } = dashboardApi.useGetSummaryQuery(filters)
    const { data: activityRes, isLoading: activityLoading, error: activityError } = dashboardApi.useGetActivitySummaryQuery(filters)
    const { data: categoryRes, isLoading: categoryLoading, error: categoryError } = dashboardApi.useGetBudgetByCategoryQuery(filters)
    const { data: breakdownRes, isLoading: breakdownLoading, error: breakdownError } = dashboardApi.useGetBreakdownsQuery(filters)
    const { data: pipelineRes } = dashboardApi.useGetPipelineQuery(filters)
    const { data: attentionRes, isLoading: attentionLoading, error: attentionError } = dashboardApi.useGetAttentionListQuery(filters)
    const { data: expiringRes, isLoading: expiringLoading } = dashboardApi.useGetExpiringContractsQuery({ ...filters, days: 90 })
    const { data: recentRes, isLoading: recentLoading } = dashboardApi.useGetRecentActivityQuery(filters)

    const summary = summaryRes?.data
    const fyCode = summaryRes?.financial_year.code
    const activity = activityRes?.data
    const breakdowns = breakdownRes?.data

    // Every figure below opens the records it counts
    const context: DrillContext = drillContext(filters, summaryRes?.financial_year)
    const procurements = (params: Record<string, string | number | boolean | undefined> = {}) => drillTo('/procurements', context, params)
    const allList = (params: Record<string, string | boolean>) => drillTo('/tracker/all-list', context, params)
    const lookupLink = (idParam: string, noneParam: string): RowLink => (row) => procurements(row.id ? { [idParam]: row.id } : { [noneParam]: true })

    // Colour follows the category's fixed position, so filtering never repaints it
    const categorySlices = useMemo<DonutSlice[]>(() => (categoryRes?.data ?? []).map((row) => ({
        name: row.category,
        value: row.budget,
        color: CATEGORICAL[row.sort_order - 1] ?? CHROME.tick,
        href: drillTo('/budget-lines', drillContext(filters, categoryRes?.financial_year), { category_id: row.category_id }),
    })), [categoryRes, filters.category_id, filters.owner_id, filters.fy_id])

    // Open items per phase of the process, including phases nothing has reached
    const phases = useMemo(() => PHASES.map((phase) => {
        const steps = (pipelineRes?.data ?? []).filter((step) => step.stage_group === phase && step.stage_code !== 'NOT_STARTED')
        return { phase, items: steps.reduce((sum, step) => sum + step.items, 0), overdue: steps.reduce((sum, step) => sum + step.overdue, 0) }
    }), [pipelineRes])
    const busiestPhase = Math.max(1, ...phases.map((p) => p.items))

    return (
        <>
            <PageHeader title="ICT Department Dashboard" subtitle={`${fyCode ? `Financial year ${fyCode}` : 'Loading financial year...'} · Welcome, ${user?.full_name} · Click any chart or figure to see the records behind it`} />

            <DashboardFilterBar categoryId={extra.categoryId} ownerId={extra.ownerId} onChange={setExtra} />

            {/* Where things stand */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="grid grid-cols-2 content-start gap-4 xl:col-span-4">
                    {isLoading ? <div className="col-span-2"><LoadingState /></div> : error ? <div className="col-span-2"><ErrorState error={error} /></div> : summary && (
                        <>
                            <Link to={procurements()} className="col-span-2 block rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
                                <p className="text-sm font-semibold text-gray-900">Procurements</p>
                                <p className="tabular mt-1 text-3xl font-bold text-gray-900">{formatNumber(summary.procurements.total)}</p>
                                <p className="text-xs text-gray-500">{summary.procurements.in_progress} in progress · {summary.procurements.not_started} not started · {summary.procurements.on_hold} on hold</p>
                            </Link>
                            <Tile label="Past step target" value={String(summary.procurements.overdue)} hint="Longer at a step than its target" icon={TriangleAlert} tone={summary.procurements.overdue > 0 ? 'danger' : 'neutral'} onClick={() => navigate(procurements({ overdue: true }))} />
                            <Tile label="Escalated" value={String(summary.procurements.escalated)} hint="Open items escalated" icon={Flag} tone={summary.procurements.escalated > 0 ? 'warning' : 'neutral'} onClick={() => navigate(procurements({ is_escalated: true, open_only: true }))} />
                            <Tile label="Contracted" value={formatMoneyCompact(summary.contracted)} hint="Value of contracts awarded" icon={FileSignature} onClick={() => navigate(drillTo('/contracts', context))} />
                            <Tile label="Paid" value={formatMoneyCompact(summary.paid)} hint={`${formatPercent(summary.budget_utilisation_percent)} of budget`} icon={Banknote} onClick={() => navigate(drillTo('/payments', context))} />
                        </>
                    )}
                </div>

                <section className="rounded-lg bg-white shadow-sm xl:col-span-4">
                    <div className="border-b border-gray-100 px-5 py-3">
                        <h2 className="text-base font-semibold text-gray-900">Budget distribution</h2>
                        <p className="text-xs text-gray-500">Planned spend for the year, by category</p>
                    </div>
                    <div className="space-y-4 p-4">
                        {categoryLoading ? <LoadingState /> : categoryError ? <ErrorState error={categoryError} /> : (
                            <DonutChart stacked slices={categorySlices} centerValue={formatMoneyCompact(summary?.budget)} centerLabel="Total budget" formatValue={formatMoneyCompact} />
                        )}
                        {canCreate(user) && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-800 p-4 text-white">
                                <div>
                                    <p className="font-semibold">Record an invoice</p>
                                    <p className="text-xs text-green-100">Add it against a contract as soon as it arrives</p>
                                </div>
                                <Link to={drillWithoutYear('/invoices', context, { unpaid_only: true })} className="btn btn-sm border-0 bg-white text-green-900 hover:bg-green-50"><Receipt size={15} aria-hidden />Invoices</Link>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-lg bg-white shadow-sm xl:col-span-4">
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-5 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Activity summary</h2>
                            <p className="text-xs text-gray-500">Memos, follow-ups and tasks from the All list</p>
                        </div>
                        <Link to="/memos" className="btn btn-xs btn-ghost text-green-800"><FilePlus2 size={14} aria-hidden />Memos</Link>
                    </div>
                    <div className="p-4">
                        {activityLoading ? <LoadingState /> : activityError ? <ErrorState error={activityError} /> : activity && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <MiniFigure label="Total activities" value={String(activity.total)} to={drillTo('/tracker/all-list', context)} />
                                    <MiniFigure label="Completion rate" value={formatPercent(activity.completion_rate_percent)} hint={`${activity.completed} completed`} to={allList({ status: 'Completed' })} />
                                    <MiniFigure label="Overdue activities" value={String(activity.overdue)} hint="Approval date passed, not completed" to={allList({ overdue: true })} />
                                    <MiniFigure label="Escalated activities" value={String(activity.escalated)} to={allList({ escalated: true })} />
                                </div>
                                <p className="mb-2 mt-4 text-sm font-semibold text-gray-900">By status</p>
                                <StatusBars rows={activity.by_status} linkOf={(status) => allList({ status })} />
                                <p className="mb-2 mt-4 text-sm font-semibold text-gray-900">By priority</p>
                                <StatusBars rows={activity.by_priority} linkOf={(priority) => allList({ priority })} colorOf={(name) => ORDINAL_BLUE[activity.by_priority.findIndex((row) => row.name === name)] ?? CHROME.tick} />
                            </>
                        )}
                    </div>
                </section>
            </div>

            {/* The money, and where work sits */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
                <SpendTrendPanel filters={filters} summary={summary} fyCode={fyCode} className="xl:col-span-5" />
                <section className="rounded-lg bg-white shadow-sm xl:col-span-7">
                    <div className="border-b border-gray-100 px-5 py-3">
                        <h2 className="text-base font-semibold text-gray-900">Process phases</h2>
                        <p className="text-xs text-gray-500">Open procurements in each phase, from memo to close</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                        {phases.map((p) => (
                            <Link key={p.phase} to={procurements({ stage_group: p.phase, open_only: true })} className="block rounded-lg bg-gray-50 p-3 transition hover:bg-gray-100">
                                <p className="text-xs text-gray-500">{p.phase}</p>
                                <p className="tabular text-xl font-bold text-gray-900">{p.items}</p>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden>
                                    <div className="h-full rounded-full bg-green-700" style={{ width: `${(p.items / busiestPhase) * 100}%` }} />
                                </div>
                                <p className={`mt-1 text-xs ${p.overdue > 0 ? 'font-medium text-red-700' : 'text-gray-500'}`}>{p.overdue > 0 ? `${p.overdue} past target` : 'None past target'}</p>
                            </Link>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 px-5 py-3">
                        <h3 className="mb-2 text-sm font-semibold text-gray-900">Latest step updates</h3>
                        {recentLoading ? <LoadingState /> : (recentRes?.data.steps.length ?? 0) === 0 ? <EmptyState message="No steps recorded yet." /> : (
                            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
                                {recentRes?.data.steps.map((step) => (
                                    <li key={step.event_id} className="min-w-0">
                                        <Link to={`/procurements/${step.procurement_id}`} className="block truncate text-sm font-medium text-gray-900 hover:underline" title={step.title}>{step.title}</Link>
                                        <p className="truncate text-xs text-gray-500">{step.stage_name} · {step.status} · {formatDate(step.event_date)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            <ChartSection title="How everything splits" className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                <DonutCard title="Procurement status" subtitle="Every procurement this year" slices={withStatusColors(breakdowns?.status, (row) => procurements({ status: row.name }))} centerLabel="Procurements" isLoading={breakdownLoading} error={breakdownError} />
                <DonutCard title="Priority" subtitle="Procurements by priority" slices={withOrdinalColors(breakdowns?.priority, lookupLink('priority_id', 'no_priority'))} centerLabel="Procurements" isLoading={breakdownLoading} error={breakdownError} />
                <DonutCard title="Acquisition method" subtitle="How items are being bought" slices={withCategoricalColors(breakdowns?.method, lookupLink('acquisition_method_id', 'no_method'))} centerLabel="Procurements" isLoading={breakdownLoading} error={breakdownError} />
                <DonutCard title="Contract status" subtitle="Contracts awarded this year" slices={withStatusColors(breakdowns?.contract_status, (row) => drillTo('/contracts', context, { status: row.name }))} centerLabel="Contracts" isLoading={breakdownLoading} error={breakdownError} />
                <DonutCard title="Invoice status" subtitle="Invoices against this year's contracts" slices={withStatusColors(breakdowns?.invoice_status, (row) => drillTo('/invoices', context, { status: row.name }))} centerLabel="Invoices" isLoading={breakdownLoading} error={breakdownError} />
                <DonutCard title="Task status" subtitle="Follow-up tasks" slices={withStatusColors(breakdowns?.task_status, (row) => `/tasks?status=${encodeURIComponent(row.name)}${extra.ownerId ? `&owner_id=${extra.ownerId}` : ''}`)} centerLabel="Tasks" isLoading={breakdownLoading} error={breakdownError} />
            </ChartSection>

            <ChartSection title="Money in detail" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <BudgetByCategoryChart filters={filters} />
                <TopBudgetLinesChart filters={filters} />
                <QuarterlySpendChart filters={filters} />
                <YearComparisonChart filters={{ category_id: extra.categoryId, owner_id: extra.ownerId }} />
            </ChartSection>

            <ChartSection title="Work in detail" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PipelineChart filters={filters} />
                <OfficerWorkloadChart filters={filters} />
            </ChartSection>

            {/* Needs attention */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title={`Needs attention (${attentionRes?.data.length ?? 0})`} className="xl:col-span-2" padded={false}
                    actions={<Link to={procurements({ overdue: true })} className="text-sm text-green-800 hover:underline">View all overdue</Link>}>
                    {attentionLoading ? <LoadingState /> : attentionError ? <ErrorState error={attentionError} /> :
                        (attentionRes?.data.length ?? 0) === 0 ? <EmptyState message="Nothing overdue or escalated." /> : (
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr><th>Procurement</th><th className="hidden lg:table-cell">Owner</th><th className="hidden md:table-cell">Current step</th><th className="text-right">Days</th><th className="hidden sm:table-cell">Flags</th></tr>
                                    </thead>
                                    <tbody>
                                        {attentionRes?.data.slice(0, ATTENTION_ROWS).map((item) => (
                                            <tr key={item.procurement_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/procurements/${item.procurement_id}`)}>
                                                <td className="max-w-[13rem] sm:max-w-xs">
                                                    <p className="truncate font-medium text-gray-900">{item.title}</p>
                                                    <p className="text-xs text-gray-500">{item.category}{item.priority ? ` · ${item.priority}` : ''}</p>
                                                </td>
                                                <td className="hidden lg:table-cell whitespace-nowrap">{item.owner_name}</td>
                                                <td className="hidden md:table-cell">{item.current_stage_name ?? <StatusBadge status={item.status} />}</td>
                                                <td className="tabular whitespace-nowrap text-right">{item.days_in_stage ?? '—'}<span className="text-gray-500"> / {item.sla_days ?? '—'}</span></td>
                                                <td className="hidden sm:table-cell">
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

            {/* Unpaid invoices and recent payments */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <RenderWhenNear><InvoiceAgeingChart filters={filters} /></RenderWhenNear>
                <Card title="Recent payments" padded={false}
                    actions={<Link to={drillTo('/payments', context)} className="text-sm text-green-800 hover:underline">View all</Link>}>
                    {recentLoading ? <LoadingState /> : (recentRes?.data.payments.length ?? 0) === 0 ? <EmptyState message="No payments recorded yet." /> : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead><tr><th>Supplier</th><th className="hidden sm:table-cell">Invoice</th><th>Date</th><th className="text-right">Amount</th></tr></thead>
                                <tbody>
                                    {recentRes?.data.payments.map((payment) => (
                                        <tr key={payment.payment_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/invoices/${payment.invoice_id}`)}>
                                            <td className="max-w-[10rem] truncate font-medium text-gray-900 sm:max-w-xs">{payment.supplier_name}</td>
                                            <td className="hidden sm:table-cell">{payment.invoice_number}</td>
                                            <td className="tabular whitespace-nowrap">{formatDate(payment.payment_date)}</td>
                                            <td className="tabular whitespace-nowrap text-right">{formatMoney(payment.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
