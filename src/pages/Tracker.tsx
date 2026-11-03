import React from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useReferenceData } from '../hooks/useReferenceData'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { trackerApi } from '../features/api/TrackerApi'
import { useSelectedFy } from '../store/hooks'
import type { TrackerBudgetLine, TrackerData, TrackerProcurement } from '../types/Types'
import { formatDate, formatMoney } from '../utils/format'
import ActiveFilters from '../components/common/ActiveFilters'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import { ErrorState, LoadingState } from '../components/common/States'

/**
 * One page per sheet of the workbook, with the sheet's own headers in the sheet's
 * order, and every section and column even when nothing is in them yet.
 * Read only. Rows open the record where it is edited.
 */

// The URL says which sheet. A section belongs to a sheet by the first letter of its id.
const SHEETS = [
    { slug: 'all-list', sectionPrefix: 'T', title: 'Procurement of Assets: All list' },
    { slug: 'assets-infra-sw', sectionPrefix: 'A', title: 'Procurement of Assets: Infra, Sw' },
    { slug: 'maintenance-support', sectionPrefix: 'M', title: 'Maintenance & Support' },
    { slug: 'consultancy', sectionPrefix: 'C', title: 'Consultancy' },
    { slug: 'subscription-support', sectionPrefix: 'S', title: 'Subscription & Support' },
]

// The sheet's header for each workflow step. Steps not listed here (contract,
// delivery and any added in Settings) go after the sheet's own columns.
const STEP_HEADERS: Record<string, string> = {
    EGP_PR_RAISED: 'Raise PR on eGP',
    EGP_HOD: 'eGP Approval Status by HOD',
    EGP_DCS: 'eGP Approval Status by DCS',
    EGP_SCM: 'eGP Approval Status by SCM',
    EGP_DG: 'eGP Approval Status by DG',
    EGP_BOARD: 'eGP Approval Status by Board',
    TOR_PREPARATION: 'ToR preparation by ICT',
    TOR_APPROVAL: 'ToR Approval by ICT',
    TOR_TO_SCM: 'ToR submitted to SCM',
    SCM_STARTED: 'Acquisition process started by SCM',
    TENDER_FLOATED: 'Quotation/Tender Float Date',
    TENDER_OPENED: 'Tender/Quotation Opening Date',
    EVALUATION: 'Evaluation started',
    ERP_PR_RAISED: 'Raise PR on ERP',
    ERP_HOD: 'ERP Approval Status by HOD',
    ERP_FINANCE: 'ERP Approval Status by Finance',
    ERP_DG: 'ERP Approval Status by DG',
    ERP_SCM: 'ERP Approval Status by SCM',
}

// Memo steps have their own columns on the All list; the budget sheets have none
const MEMO_STAGES = ['MEMO_TO_DG', 'DG_APPROVAL']

// Extra columns the sheet has right after a step, or instead of its usual cell
const SCM_OFFICER_AFTER = 'EGP_SCM'
const METHOD_AFTER = 'SCM_STARTED'
const DAYS_AFTER = 'TENDER_FLOATED'

const TRAILING_HEADERS = ['Escalated', 'Escalated To', '% Complete', 'Notes']

type Stage = TrackerData['stages'][number]

const STEP_TONES: Record<string, string> = {
    Approved: 'text-green-800',
    Completed: 'text-green-800',
    'In Progress': 'text-blue-800',
    'In Review': 'text-purple-800',
    Pending: 'text-amber-800',
    Returned: 'text-purple-800',
    Rejected: 'text-red-800',
}

const Empty = () => <span className="text-gray-300">—</span>

const cell = 'whitespace-nowrap text-xs'
const titleCell = 'sticky left-0 z-10 min-w-64 max-w-80 bg-white text-xs font-medium text-gray-900'
const titleHeader = 'sticky left-0 z-10 whitespace-nowrap bg-white'

const Text: React.FC<{ value?: string | number | null }> = ({ value }) =>
    value === null || value === undefined || value === '' ? <Empty /> : <>{value}</>

const DateText: React.FC<{ value?: string | null }> = ({ value }) => (value ? <span className="tabular">{formatDate(value)}</span> : <Empty />)

// Splits the steps into the sheet's own columns and the extra ones after them
const splitStages = (stages: Stage[], withMemoExtras: boolean) => ({
    sheetStages: stages.filter((s) => STEP_HEADERS[s.code]),
    extraStages: stages.filter((s) => !STEP_HEADERS[s.code] && (withMemoExtras || !MEMO_STAGES.includes(s.code))),
})

// Number of columns the process part of a sheet takes up
const processColumnCount = (sheetStages: Stage[], extraStages: Stage[]) =>
    sheetStages.length + 3 + TRAILING_HEADERS.length + extraStages.length // 3 = SCM officer, method, tender days

const ProcessHeaders: React.FC<{ sheetStages: Stage[]; extraStages: Stage[] }> = ({ sheetStages, extraStages }) => (
    <>
        {sheetStages.map((stage) => (
            <React.Fragment key={stage.code}>
                <th className="whitespace-nowrap">{STEP_HEADERS[stage.code]}</th>
                {stage.code === SCM_OFFICER_AFTER && <th className="whitespace-nowrap">SCM Officer Allocated</th>}
                {stage.code === METHOD_AFTER && <th className="whitespace-nowrap">Acquisition method</th>}
                {stage.code === DAYS_AFTER && <th className="whitespace-nowrap">Quotation/Tender No of Days</th>}
            </React.Fragment>
        ))}
        {TRAILING_HEADERS.map((header) => <th key={header} className={`whitespace-nowrap ${header === '% Complete' ? 'text-right' : ''}`}>{header}</th>)}
        {extraStages.map((stage) => <th key={stage.code} data-extra className="whitespace-nowrap bg-gray-50">{stage.name}</th>)}
    </>
)

// A step's status and date, or the sheet's date field for the tender steps
const StepCell: React.FC<{ stage: Stage; item?: TrackerProcurement }> = ({ stage, item }) => {
    const step = item?.steps[stage.code]
    if (stage.code === 'TENDER_FLOATED') return <td className={cell}><DateText value={item?.tender_float_date ?? step?.event_date} /></td>
    if (stage.code === 'TENDER_OPENED') return <td className={cell}><DateText value={item?.tender_opening_date ?? step?.event_date} /></td>
    return (
        <td className={cell}>
            {step ? (
                <>
                    <p className={`font-medium ${STEP_TONES[step.status] ?? 'text-gray-700'}`}>{step.status}</p>
                    <p className="tabular text-gray-500">{formatDate(step.event_date)}</p>
                </>
            ) : <Empty />}
        </td>
    )
}

const ProcessCells: React.FC<{ sheetStages: Stage[]; extraStages: Stage[]; item?: TrackerProcurement }> = ({ sheetStages, extraStages, item }) => (
    <>
        {sheetStages.map((stage) => (
            <React.Fragment key={stage.code}>
                <StepCell stage={stage} item={item} />
                {stage.code === SCM_OFFICER_AFTER && <td className={cell}><Text value={item?.scm_officer} /></td>}
                {stage.code === METHOD_AFTER && <td className={cell}><Text value={item?.acquisition_method} /></td>}
                {stage.code === DAYS_AFTER && <td className={`${cell} tabular`}><Text value={item?.tender_days} /></td>}
            </React.Fragment>
        ))}
        <td className={cell}>{item ? (item.is_escalated ? <span className="font-medium text-orange-700">Yes</span> : 'No') : <Empty />}</td>
        <td className={cell}><Text value={item?.escalated_to} /></td>
        <td className={`${cell} tabular text-right`}>{item ? `${item.progress_percent ?? 0}%` : <Empty />}</td>
        <td className="min-w-48 text-xs"><Text value={item?.notes} /></td>
        {extraStages.map((stage) => <StepCell key={stage.code} stage={stage} item={item} />)}
    </>
)

// Shaded header row of a section, like the sheet's
const SectionRow: React.FC<{ name: string; columns: number; count: number }> = ({ name, columns, count }) => (
    <tr className="bg-green-50">
        <td colSpan={columns} className="text-xs font-semibold text-green-900">
            <span className="sticky left-3">{name}<span className="ml-2 font-normal text-gray-600">{count === 0 ? 'Nothing recorded yet' : `${count} item${count === 1 ? '' : 's'}`}</span></span>
        </td>
    </tr>
)

/* ------------------------------ All list sheet ----------------------------- */

// What a click on the dashboard's activity summary narrows the list to
interface ActivityFilter {
    status?: string
    priority?: string
    category?: string
    owner?: string
    overdue?: boolean
    escalated?: boolean
}

// The dashboard counts an open task as Not Started and a done one as Completed
const taskActivityStatus = (status: string) => (status === 'Open' ? 'Not Started' : status === 'Done' ? 'Completed' : status)

const AllListSheet: React.FC<{ data: TrackerData; filter: ActivityFilter }> = ({ data, filter }) => {
    const isFiltered = Object.values(filter).some(Boolean)
    const today = new Date().toISOString().slice(0, 10)
    const matches = (row: { status: string; priority: string | null; owner_name: string; category?: string }) =>
        (!filter.status || row.status === filter.status)
        && (!filter.priority || row.priority === filter.priority)
        && (!filter.owner || row.owner_name === filter.owner)
        && (!filter.category || row.category === filter.category)
    const { sheetStages, extraStages } = splitStages(data.stages, false)
    const sections = data.sections.filter((s) => s.name.startsWith('T'))
    const memoSection = sections[0]?.section_id
    const memoRefs = new Set(data.memos.map((m) => m.reference))
    const sectionIds = new Set(sections.map((s) => s.section_id))
    const standalone = data.procurements.filter((p) => !p.budget_line_id && !memoRefs.has(p.reference))
    const groups = [
        ...sections.map((s) => ({ id: s.section_id as number | null, name: s.name })),
        { id: null, name: 'Not in a section' },
    ]
    const columns = 9 + processColumnCount(sheetStages, extraStages)
    const process = { sheetStages, extraStages }

    return (
        <table className="table table-sm">
            <thead>
                <tr>
                    <th className="whitespace-nowrap">Task ID</th>
                    <th className={titleHeader}>Task Name / Activity</th>
                    {['Owner', 'Category', 'Priority', 'Delivery Day to DG', 'Day Approved by DG', 'DG Approval Status', 'Memo Status'].map((header) => <th key={header} className="whitespace-nowrap">{header}</th>)}
                    <ProcessHeaders {...process} />
                </tr>
            </thead>
            <tbody>
                {groups.map((group) => {
                    const inGroup = (id: number | null) => (group.id === null ? id === null || !sectionIds.has(id) : id === group.id)
                    const memos = (group.id === memoSection ? data.memos : []).filter((m) => matches(m)
                        && (!filter.overdue || (!!m.approved_date && m.approved_date.slice(0, 10) < today && m.status !== 'Completed'))
                        && !filter.escalated)
                    const items = standalone.filter((p) => inGroup(p.section_id) && matches(p) && !filter.overdue && (!filter.escalated || p.is_escalated))
                    const tasks = data.tasks.filter((t) => inGroup(t.section_id)
                        && matches({ ...t, status: taskActivityStatus(t.status) })
                        && !filter.category && !filter.overdue && !filter.escalated)
                    const count = memos.length + items.length + tasks.length
                    // Empty sections stay on the sheet, but not when looking for something specific
                    if ((group.id === null || isFiltered) && count === 0) return null

                    return (
                        <React.Fragment key={group.name}>
                            <SectionRow name={group.name} columns={columns} count={count} />
                            {memos.map((memo) => (
                                <tr key={`memo-${memo.memo_id}`} className="hover:bg-gray-50">
                                    <td className={`${cell} tabular`}><Text value={memo.reference} /></td>
                                    <td className={titleCell}><Link to="/memos" className="hover:underline">{memo.title}</Link></td>
                                    <td className={cell}>{memo.owner_name}</td>
                                    <td className={cell}>{memo.category}</td>
                                    <td className={cell}><Text value={memo.priority} /></td>
                                    <td className={cell}><DateText value={memo.delivered_date} /></td>
                                    <td className={cell}><DateText value={memo.approved_date} /></td>
                                    <td className={cell}>{memo.dg_status ? <StatusBadge status={memo.dg_status} /> : <Empty />}</td>
                                    <td className={cell}><StatusBadge status={memo.status} /></td>
                                    <ProcessCells {...process} />
                                </tr>
                            ))}
                            {items.map((item) => (
                                <tr key={`procurement-${item.procurement_id}`} className="hover:bg-gray-50">
                                    <td className={`${cell} tabular`}><Text value={item.reference} /></td>
                                    <td className={titleCell}><Link to={`/procurements/${item.procurement_id}`} className="hover:underline">{item.title}</Link></td>
                                    <td className={cell}>{item.owner_name}</td>
                                    <td className={cell}>{item.category}</td>
                                    <td className={cell}><Text value={item.priority} /></td>
                                    <td className={cell}><DateText value={item.steps.MEMO_TO_DG?.event_date} /></td>
                                    <td className={cell}><DateText value={item.steps.DG_APPROVAL?.event_date} /></td>
                                    <td className={cell}><Text value={item.steps.DG_APPROVAL?.status} /></td>
                                    <td className={cell}><StatusBadge status={item.status} /></td>
                                    <ProcessCells {...process} item={item} />
                                </tr>
                            ))}
                            {tasks.map((task) => (
                                <tr key={`task-${task.task_id}`} className="hover:bg-gray-50">
                                    <td className={cell}><Empty /></td>
                                    <td className={titleCell}><Link to="/tasks?all=true" className="hover:underline">{task.title}</Link></td>
                                    <td className={cell}>{task.owner_name}</td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><Text value={task.priority} /></td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><StatusBadge status={task.status} /></td>
                                    <ProcessCells {...process} />
                                </tr>
                            ))}
                        </React.Fragment>
                    )
                })}
            </tbody>
        </table>
    )
}

/* ----------------------------- Budget line sheets -------------------------- */

const BudgetSheet: React.FC<{ data: TrackerData; sectionPrefix: string; fyId?: number }> = ({ data, sectionPrefix, fyId }) => {
    const { sheetStages, extraStages } = splitStages(data.stages, true)
    const sections = data.sections.filter((s) => s.name.startsWith(sectionPrefix))
    const process = { sheetStages, extraStages }

    // Years nothing has been planned in (such as a past one) get no column
    const years = data.financial_years.filter((fy) => data.budget_lines.some((l) => l.allocations.some((a) => a.fy_id === fy.fy_id)))
    const columns = 7 + years.length + 5 + processColumnCount(sheetStages, extraStages)
    const money = (value?: number) => (value ? <span className="tabular">{formatMoney(value)}</span> : <Empty />)

    const row = (line: TrackerBudgetLine) => {
        const procurement = data.procurements.find((p) => p.budget_line_id === line.budget_line_id)
        const thisYear = line.allocations.find((a) => a.fy_id === fyId)
        return (
            <tr key={line.budget_line_id} className="hover:bg-gray-50">
                <td className={`${cell} tabular`}><Text value={line.code} /></td>
                <td className={titleCell}><Link to={`/budget-lines/${line.budget_line_id}`} className="hover:underline">{line.description}</Link></td>
                <td className={cell}>{line.category}</td>
                <td className={`${cell} tabular text-right`}>{line.quantity}</td>
                <td className={`${cell} text-right`}>{money(line.unit_price)}</td>
                <td className={`${cell} text-right`}>{money(line.total_amount)}</td>
                <td className={cell}>{line.owner_name}</td>
                {years.map((fy) => (
                    <td key={fy.fy_id} className={`${cell} text-right`}>{money(line.allocations.find((a) => a.fy_id === fy.fy_id)?.planned_amount)}</td>
                ))}
                <td className={`${cell} text-right`}>{money(thisYear?.q1_amount)}</td>
                <td className={`${cell} text-right`}>{money(thisYear?.q2_amount)}</td>
                <td className={`${cell} text-right`}>{money(thisYear?.q3_amount)}</td>
                <td className={`${cell} text-right`}>{money(thisYear?.q4_amount)}</td>
                <td className={cell}><Text value={line.priority} /></td>
                <ProcessCells {...process} item={procurement} />
            </tr>
        )
    }

    return (
        <table className="table table-sm">
            <thead>
                <tr>
                    <th className="whitespace-nowrap">Category ID</th>
                    <th className={titleHeader}>Asset Description</th>
                    <th>Category</th>
                    <th className="text-right">Quantity</th>
                    <th className="whitespace-nowrap text-right">Price per unit</th>
                    <th className="whitespace-nowrap text-right">Total Sum</th>
                    <th className="whitespace-nowrap">Officer Assigned</th>
                    {/* 2026/27 is written FY 26/27, as on the sheets */}
                    {years.map((fy) => <th key={fy.fy_id} className="whitespace-nowrap text-right">Expenditure FY {fy.code.slice(2)}</th>)}
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <th key={q} className="whitespace-nowrap text-right">Expenditure {q}</th>)}
                    <th>Priority</th>
                    <ProcessHeaders {...process} />
                </tr>
            </thead>
            <tbody>
                {sections.map((section) => {
                    const lines = data.budget_lines.filter((l) => l.section_id === section.section_id)
                    return (
                        <React.Fragment key={section.section_id}>
                            <SectionRow name={section.name} columns={columns} count={lines.length} />
                            {lines.map(row)}
                        </React.Fragment>
                    )
                })}
            </tbody>
        </table>
    )
}

/* ---------------------------------- Page ----------------------------------- */

const Tracker: React.FC = () => {
    const { sheet: slug } = useParams()
    const fyId = useSelectedFy()
    const filters = useUrlFilters()
    const { categories, staff } = useReferenceData()
    const { data, isLoading, error, refetch } = trackerApi.useGetTrackerQuery({ fy_id: filters.getNumber('fy_id') ?? fyId })
    const sheet = SHEETS.find((s) => s.slug === slug)
    if (!sheet) return <Navigate to={`/tracker/${SHEETS[0].slug}`} replace />

    const unsectioned = data?.data.budget_lines.filter((l) => !l.section_id) ?? []
    const activityFilter: ActivityFilter = {
        status: filters.getString('status'),
        priority: filters.getString('priority'),
        category: categories.find((c) => c.lookup_id === filters.getNumber('category_id'))?.value,
        owner: staff.find((u) => u.user_id === filters.getNumber('owner_id'))?.full_name,
        overdue: filters.getBool('overdue'),
        escalated: filters.getBool('escalated'),
    }

    return (
        <>
            <PageHeader title={sheet.title} subtitle={`Financial year ${data?.financial_year.code ?? ''}. Scroll sideways to see every column.`} />

            {sheet.sectionPrefix === 'T' && Object.values(activityFilter).some(Boolean) && (
                <>
                    <ActiveFilters items={[
                        activityFilter.status && `Status: ${activityFilter.status}`,
                        activityFilter.priority && `Priority: ${activityFilter.priority}`,
                        activityFilter.category && `Category: ${activityFilter.category}`,
                        activityFilter.owner && `Officer: ${activityFilter.owner}`,
                        activityFilter.overdue && 'Overdue',
                        activityFilter.escalated && 'Escalated',
                    ]} />
                    <button className="btn btn-ghost btn-sm mb-3" onClick={filters.clearFilters}>Show the whole sheet</button>
                </>
            )}

            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : data && (
                    <div className="overflow-x-auto">
                        {sheet.sectionPrefix === 'T'
                            ? <AllListSheet data={data.data} filter={activityFilter} />
                            : <BudgetSheet data={data.data} sectionPrefix={sheet.sectionPrefix} fyId={data.financial_year.fy_id} />}
                    </div>
                )}
            </div>

            {sheet.sectionPrefix !== 'T' && unsectioned.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                    {unsectioned.length} budget line{unsectioned.length === 1 ? ' has' : 's have'} no tracker section, so {unsectioned.length === 1 ? 'it does' : 'they do'} not appear on any sheet. Set one under <Link to="/budget-lines" className="text-green-800 hover:underline">Budget Lines</Link>.
                </p>
            )}
        </>
    )
}

export default Tracker
