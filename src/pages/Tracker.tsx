import React, { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { Pencil, Plus } from 'lucide-react'
import { trackerApi } from '../features/api/TrackerApi'
import { useReferenceData } from '../hooks/useReferenceData'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { setFinancialYear } from '../features/slice/FilterSlice'
import { useAppDispatch, useCurrentUser, useSelectedFy } from '../store/hooks'
import { taskStatusLabel, type Memo, type Task, type TrackerBudgetLine, type TrackerData, type TrackerProcurement } from '../types/Types'
import { formatDate, formatMoney } from '../utils/format'
import { canCreate, canEditOwned, isAdmin } from '../utils/permissions'
import { QUARTERS, quarterRange } from '../utils/quarters'
import { MEMO_STAGES, STEP_HEADERS } from '../utils/sheetColumns'
import ActiveFilters from '../components/common/ActiveFilters'
import BalanceCheck from '../components/common/BalanceCheck'
import { IconButton } from '../components/common/Buttons'
import PageHeader from '../components/common/PageHeader'
import QuarterSelect from '../components/common/QuarterSelect'
import StatusBadge from '../components/common/StatusBadge'
import { ErrorState, LoadingState } from '../components/common/States'
import MemoFormModal from '../components/memos/MemoFormModal'
import TaskFormModal from '../components/tasks/TaskFormModal'
import SheetRowCard from '../components/tracker/SheetRowCard'

/**
 * One page per sheet of the workbook, with the sheet's own headers in the sheet's
 * order, and every section and column even when nothing is in them yet.
 *
 * The tables only show the data. Rows are changed in a card holding all their
 * fields, opened with a row's Edit button or a section's Add button. Officers can
 * edit the rows assigned to them and the Head of ICT any row; the API enforces it.
 */

// The URL says which sheet. A section belongs to a sheet by the first letter of its id.
const SHEETS = [
    { slug: 'all-list', sectionPrefix: 'T', title: 'Procurement of Assets_All list' },
    { slug: 'assets-infra-sw', sectionPrefix: 'A', title: 'Procurement of Assets_Infra, Sw' },
    { slug: 'maintenance-support', sectionPrefix: 'M', title: 'Maintenance & Support' },
    { slug: 'consultancy', sectionPrefix: 'C', title: 'Consultancy' },
    { slug: 'subscription-support', sectionPrefix: 'S', title: 'Subscription & Support' },
]

// Extra columns the sheet has right after a step
const SCM_OFFICER_AFTER = 'EGP_SCM'
const METHOD_AFTER = 'SCM_STARTED'
const DAYS_AFTER = 'TENDER_FLOATED'

const TRAILING_HEADERS = ['Escalated', 'Escalated To', '% Complete', 'Notes']
const QUARTER_FIELDS = ['q1_actual', 'q2_actual', 'q3_actual', 'q4_actual'] as const

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

const Empty = () => <span className="text-gray-400">—</span>

const cell = 'whitespace-nowrap text-sm'
const titleCell = 'sticky left-0 z-10 min-w-80 max-w-md bg-white text-sm font-medium text-gray-900'
const titleHeader = 'sticky left-0 z-20 whitespace-nowrap !bg-gray-100'

const Text: React.FC<{ value?: string | number | null }> = ({ value }) =>
    value === null || value === undefined || value === '' ? <Empty /> : <>{value}</>

const DateText: React.FC<{ value?: string | null }> = ({ value }) => (value ? <span className="tabular">{formatDate(value)}</span> : <Empty />)

// What can be opened in a card
type CardTarget =
    | { kind: 'memo'; memo?: TrackerData['memos'][number] }
    | { kind: 'task'; task?: TrackerData['tasks'][number]; sectionId?: number }
    | { kind: 'procurement'; item?: TrackerProcurement; sectionId?: number }
    | { kind: 'budget'; line?: TrackerBudgetLine; item?: TrackerProcurement; sectionId?: number }

type OpenCard = (target: CardTarget) => void

/* --------------------------------- Process --------------------------------- */

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
                    <p className="tabular text-gray-500">{step.date_known ? formatDate(step.event_date) : 'Date not recorded'}</p>
                </>
            ) : <Empty />}
        </td>
    )
}

// The trailing columns of a row: a procurement's own, or a memo's or task's
interface RowFlags {
    is_escalated: boolean
    escalated_to: string | null
    notes: string | null
}

const ProcessCells: React.FC<{ sheetStages: Stage[]; extraStages: Stage[]; item?: TrackerProcurement; flags?: RowFlags }> = ({ sheetStages, extraStages, item, flags = item }) => (
    <>
        {sheetStages.map((stage) => (
            <React.Fragment key={stage.code}>
                <StepCell stage={stage} item={item} />
                {stage.code === SCM_OFFICER_AFTER && <td className={cell}><Text value={item?.scm_officer} /></td>}
                {stage.code === METHOD_AFTER && <td className={cell}><Text value={item?.acquisition_method} /></td>}
                {stage.code === DAYS_AFTER && <td className={`${cell} tabular`}><Text value={item?.tender_days} /></td>}
            </React.Fragment>
        ))}
        <td className={cell}>{flags ? (flags.is_escalated ? <span className="font-medium text-orange-700">Yes</span> : 'No') : <Empty />}</td>
        <td className={cell}><Text value={flags?.escalated_to} /></td>
        <td className={`${cell} tabular text-right`}>{item ? `${item.progress_percent ?? 0}%` : <Empty />}</td>
        <td className="min-w-48 text-sm"><Text value={flags?.notes} /></td>
        {extraStages.map((stage) => <StepCell key={stage.code} stage={stage} item={item} />)}
    </>
)

// Shaded header row of a section, like the sheet's, with a button to add a row to it
const SectionRow: React.FC<{ name: string; columns: number; count: number; onAdd?: () => void }> = ({ name, columns, count, onAdd }) => (
    <tr className="border-l-4 border-l-green-700 bg-green-100">
        <td colSpan={columns} className="text-sm font-semibold text-green-950">
            <span className="sticky left-3 inline-flex items-center gap-2">
                {name}
                <span className="font-normal text-green-900">{count === 0 ? 'Nothing recorded yet' : `${count} item${count === 1 ? '' : 's'}`}</span>
                {onAdd && (
                    <button type="button" onClick={onAdd} aria-label={`Add to ${name}`} className="btn btn-xs border-green-700 bg-white text-green-900 hover:bg-green-100">
                        <Plus size={12} aria-hidden />Add
                    </button>
                )}
            </span>
        </td>
    </tr>
)

// The row's title, opening its record, with the Edit button beside it
const TitleCell: React.FC<{ title: string; to: string; onEdit?: () => void }> = ({ title, to, onEdit }) => (
    <td className={titleCell}>
        <div className="flex items-center gap-1">
            <Link to={to} className="min-w-0 flex-1 whitespace-normal hover:underline">{title}</Link>
            {onEdit && <IconButton label={`Edit ${title}`} className="shrink-0" onClick={onEdit}><Pencil size={13} /></IconButton>}
        </div>
    </td>
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
    range?: { from: string; to: string } // the chosen quarter
}

// What a new row in each All list section is
const newRowKind = (sectionName: string): 'memo' | 'task' | 'procurement' => {
    if (sectionName.startsWith('T-001')) return 'memo'
    return /^T-00[2-5]/.test(sectionName) ? 'task' : 'procurement'
}

interface SheetProps {
    data: TrackerData
    canEdit: (ownerId: number) => boolean
    canAdd: boolean
    openCard: OpenCard
}

const AllListSheet: React.FC<SheetProps & { filter: ActivityFilter }> = ({ data, canEdit, canAdd, openCard, filter }) => {
    const isFiltered = Object.values(filter).some(Boolean)
    const today = new Date().toISOString().slice(0, 10)
    const matches = (row: { status: string; priority: string | null; owner_name: string; category?: string | null }) =>
        (!filter.status || row.status === filter.status)
        && (!filter.priority || row.priority === filter.priority)
        && (!filter.owner || row.owner_name === filter.owner)
        && (!filter.category || row.category === filter.category)
    const inRange = (date?: string | null) => !filter.range || (!!date && date.slice(0, 10) >= filter.range.from && date.slice(0, 10) <= filter.range.to)

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

    const addTo = (group: { id: number | null; name: string }) => {
        const sectionId = group.id as number
        const kind = newRowKind(group.name)
        openCard(kind === 'memo' ? { kind } : { kind, sectionId })
    }

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
                    const memos = (group.id === memoSection ? data.memos : []).filter((m) => matches(m) && inRange(m.delivered_date)
                        && (!filter.overdue || (!!m.approved_date && m.approved_date.slice(0, 10) < today && m.status !== 'Completed'))
                        && (!filter.escalated || m.is_escalated))
                    const items = standalone.filter((p) => inGroup(p.section_id) && matches(p) && !filter.overdue && (!filter.escalated || p.is_escalated)
                        && (!filter.range || Object.values(p.steps).some((step) => step.date_known && inRange(step.event_date))))
                    const tasks = data.tasks.filter((t) => inGroup(t.section_id)
                        && matches({ ...t, status: taskStatusLabel(t.status) })
                        && inRange(t.due_date ?? t.created_at)
                        && !filter.overdue && (!filter.escalated || t.is_escalated))
                    const count = memos.length + items.length + tasks.length
                    // Empty sections stay on the sheet, but not when looking for something specific
                    if ((group.id === null || isFiltered) && count === 0) return null

                    return (
                        <React.Fragment key={group.name}>
                            <SectionRow name={group.name} columns={columns} count={count} onAdd={canAdd && group.id !== null ? () => addTo(group) : undefined} />
                            {memos.map((memo) => {
                                // A memo with no budget line behind it keeps its steps on a procurement with its reference
                                const linked = data.procurements.find((p) => !p.budget_line_id && !!p.reference && p.reference === memo.reference)
                                return (
                                <tr key={`memo-${memo.memo_id}`} className="hover:bg-gray-50">
                                    <td className={`${cell} tabular`}><Text value={memo.reference} /></td>
                                    <TitleCell title={memo.title} to={linked ? `/procurements/${linked.procurement_id}` : '/memos'} onEdit={canEdit(memo.owner_id) ? () => openCard({ kind: 'memo', memo }) : undefined} />
                                    <td className={cell}>{memo.owner_name}</td>
                                    <td className={cell}>{memo.category}</td>
                                    <td className={cell}><Text value={memo.priority} /></td>
                                    <td className={cell}><DateText value={memo.delivered_date} /></td>
                                    <td className={cell}><DateText value={memo.approved_date} /></td>
                                    <td className={cell}>{memo.dg_status ? <StatusBadge status={memo.dg_status} /> : <Empty />}</td>
                                    <td className={cell}><StatusBadge status={memo.status} /></td>
                                    <ProcessCells {...process} item={linked} flags={{ is_escalated: memo.is_escalated, escalated_to: memo.escalated_to, notes: memo.notes ?? linked?.notes ?? null }} />
                                </tr>
                                )
                            })}
                            {items.map((item) => (
                                <tr key={`procurement-${item.procurement_id}`} className="hover:bg-gray-50">
                                    <td className={`${cell} tabular`}><Text value={item.reference} /></td>
                                    <TitleCell title={item.title} to={`/procurements/${item.procurement_id}`} onEdit={canEdit(item.owner_id) ? () => openCard({ kind: 'procurement', item }) : undefined} />
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
                                    <TitleCell title={task.title} to="/tasks?all=true" onEdit={canEdit(task.owner_id) ? () => openCard({ kind: 'task', task }) : undefined} />
                                    <td className={cell}>{task.owner_name}</td>
                                    <td className={cell}><Text value={task.category} /></td>
                                    <td className={cell}><Text value={task.priority} /></td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><Empty /></td>
                                    <td className={cell}><StatusBadge status={taskStatusLabel(task.status)} /></td>
                                    <ProcessCells {...process} flags={{ is_escalated: task.is_escalated, escalated_to: task.escalated_to, notes: task.description }} />
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

const BudgetSheet: React.FC<SheetProps & { sectionPrefix: string; fyId: number; quarter?: number }> = ({ data, canEdit, canAdd, openCard, sectionPrefix, fyId, quarter }) => {
    const { sheetStages, extraStages } = splitStages(data.stages, true)
    const sections = data.sections.filter((s) => s.name.startsWith(sectionPrefix))
    const process = { sheetStages, extraStages }

    // Years nothing has been planned in (such as a past one) get no column
    const years = data.financial_years.filter((fy) => fy.fy_id === fyId || data.budget_lines.some((l) => l.allocations.some((a) => a.fy_id === fy.fy_id)))
    const columns = 7 + years.length + 5 + processColumnCount(sheetStages, extraStages)
    const money = (value?: number) => (value ? <span className="tabular">{formatMoney(value)}</span> : <Empty />)

    // A line is on the sheet in the years it is planned or being procured
    const inViewedYear = (line: TrackerBudgetLine) => line.allocations.some((a) => a.fy_id === fyId) || data.procurements.some((p) => p.budget_line_id === line.budget_line_id)

    // With a quarter chosen: the lines with spending in that quarter, as on the Budget Lines page
    const linesOf = (sectionId: number) => data.budget_lines.filter((l) => {
        if (l.section_id !== sectionId || !inViewedYear(l)) return false
        const field = quarter ? QUARTER_FIELDS[quarter - 1] : undefined
        return !field || (l.actuals.find((a) => a.fy_id === fyId)?.[field] ?? 0) > 0
    })

    // The sheet's totals, so its columns can be checked at a glance
    const shown = sections.flatMap((section) => linesOf(section.section_id))
    const sumOf = (valueOf: (line: TrackerBudgetLine) => number | undefined) => shown.reduce((sum, line) => sum + (valueOf(line) ?? 0), 0)

    const row = (line: TrackerBudgetLine) => {
        const procurementsOfLine = data.procurements.filter((p) => p.budget_line_id === line.budget_line_id)
        const item = procurementsOfLine.find((p) => p.fy_id === fyId) ?? procurementsOfLine[0]
        const thisYear = line.actuals.find((a) => a.fy_id === fyId)
        return (
            <tr key={line.budget_line_id} className="hover:bg-gray-50">
                <td className={`${cell} tabular`}><Text value={line.code} /></td>
                <TitleCell title={line.description} to={`/budget-lines/${line.budget_line_id}`} onEdit={canEdit(line.owner_id) ? () => openCard({ kind: 'budget', line, item }) : undefined} />
                <td className={cell}>{line.category}</td>
                <td className={`${cell} tabular text-right`}>{line.quantity}</td>
                <td className={`${cell} text-right`}>{money(line.unit_price)}</td>
                <td className={`${cell} text-right`}>{money(line.total_amount)}</td>
                <td className={cell}>{line.owner_name}</td>
                {years.map((fy) => <td key={fy.fy_id} className={`${cell} text-right`}>{money(line.allocations.find((a) => a.fy_id === fy.fy_id)?.planned_amount)}</td>)}
                {QUARTER_FIELDS.map((field) => <td key={field} className={`${cell} text-right`}>{money(thisYear?.[field])}</td>)}
                <td className={cell}><Text value={line.priority} /></td>
                <ProcessCells {...process} item={item} />
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
                    const lines = linesOf(section.section_id)
                    return (
                        <React.Fragment key={section.section_id}>
                            <SectionRow name={section.name} columns={columns} count={lines.length} onAdd={canAdd ? () => openCard({ kind: 'budget', sectionId: section.section_id }) : undefined} />
                            {lines.map(row)}
                        </React.Fragment>
                    )
                })}
            </tbody>
            <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-900">
                    <td />
                    <td className="sticky left-0 z-10 bg-gray-50 text-sm">Total</td>
                    <td colSpan={3} />
                    <td className={`${cell} text-right`}>{money(sumOf((l) => l.total_amount))}</td>
                    <td />
                    {years.map((fy) => <td key={fy.fy_id} className={`${cell} text-right`}>{money(sumOf((l) => l.allocations.find((a) => a.fy_id === fy.fy_id)?.planned_amount))}</td>)}
                    {QUARTER_FIELDS.map((field) => <td key={field} className={`${cell} text-right`}>{money(sumOf((l) => l.actuals.find((a) => a.fy_id === fyId)?.[field]))}</td>)}
                    <td colSpan={1 + processColumnCount(sheetStages, extraStages)} />
                </tr>
            </tfoot>
        </table>
    )
}

/* ---------------------------------- Page ----------------------------------- */

const Tracker: React.FC = () => {
    const { sheet: slug } = useParams()
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const filters = useUrlFilters()
    const dispatch = useAppDispatch()
    const { categories, staff, currentYear } = useReferenceData()
    const { data, isLoading, error, refetch } = trackerApi.useGetTrackerQuery({ fy_id: filters.getNumber('fy_id') ?? fyId })
    const [card, setCard] = useState<CardTarget | null>(null)
    const sheet = SHEETS.find((s) => s.slug === slug)
    if (!sheet) return <Navigate to={`/tracker/${SHEETS[0].slug}`} replace />

    const unsectioned = data?.data.budget_lines.filter((l) => !l.section_id) ?? []
    const quarter = filters.getNumber('quarter')
    const fyStart = data?.data.financial_years.find((fy) => fy.fy_id === data.financial_year.fy_id)?.start_date
    const activityFilter: ActivityFilter = {
        status: filters.getString('status'),
        priority: filters.getString('priority'),
        category: categories.find((c) => c.lookup_id === filters.getNumber('category_id'))?.value,
        owner: staff.find((u) => u.user_id === filters.getNumber('owner_id'))?.full_name,
        overdue: filters.getBool('overdue'),
        escalated: filters.getBool('escalated'),
        range: quarter && fyStart ? quarterRange(fyStart, quarter) : undefined,
    }
    const sheetProps: Omit<SheetProps, 'data'> = {
        canEdit: (ownerId) => canEditOwned(user, ownerId),
        canAdd: canCreate(user),
        openCard: setCard,
    }
    const closeCard = () => setCard(null)

    // The year picked at the top is remembered, so an empty All list usually means another year is picked
    const viewedYear = data?.financial_year
    const allListEmpty = sheet.sectionPrefix === 'T' && !!data
        && data.data.memos.length === 0 && data.data.tasks.length === 0 && !data.data.procurements.some((p) => !p.budget_line_id)
    const showCurrentYear = () => {
        dispatch(setFinancialYear(null))
        filters.setFilters({ fy_id: undefined })
    }

    return (
        <>
            <PageHeader title={sheet.title} subtitle={`Financial year ${data?.financial_year.code ?? ''}. Scroll sideways to see every column.`} />

            {canCreate(user) && (
                <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
                    Use the pencil beside a row to edit it, or Add on a section for a new row. {isAdmin(user) ? 'You can edit any row.' : 'You can edit the rows assigned to you.'}
                </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <span className="text-sm font-medium text-gray-600">Filter:</span>
                <QuarterSelect value={quarter} onChange={(value) => filters.setFilters({ quarter: value })} />
                <span className="text-xs text-gray-500">
                    {sheet.sectionPrefix === 'T' ? 'Memos delivered, tasks due and activities with a step recorded in the quarter' : 'Budget lines with payments made in the quarter'}
                </span>
            </div>

            {allListEmpty && viewedYear && (
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span>Nothing has been recorded on this sheet for <strong>FY {viewedYear.code}</strong>. The year is chosen at the top of the page and applies to every page.</span>
                    {currentYear && currentYear.fy_id !== viewedYear.fy_id && (
                        <button type="button" className="btn btn-sm border-amber-700 bg-white text-amber-900 hover:bg-amber-100" onClick={showCurrentYear}>
                            Show FY {currentYear.code} (current)
                        </button>
                    )}
                </div>
            )}

            {sheet.sectionPrefix !== 'T' && data && <BalanceCheck filters={{ fy_id: data.financial_year.fy_id }} />}

            {sheet.sectionPrefix === 'T' && Object.values(activityFilter).some(Boolean) && (
                <>
                    <ActiveFilters items={[
                        activityFilter.status && `Status: ${activityFilter.status}`,
                        activityFilter.priority && `Priority: ${activityFilter.priority}`,
                        activityFilter.category && `Category: ${activityFilter.category}`,
                        activityFilter.owner && `Officer: ${activityFilter.owner}`,
                        activityFilter.overdue && 'Overdue',
                        activityFilter.escalated && 'Escalated',
                        quarter && QUARTERS[quarter - 1]?.label,
                    ]} />
                    <button className="btn btn-ghost btn-sm mb-3" onClick={filters.clearFilters}>Show the whole sheet</button>
                </>
            )}

            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : data && (
                    <div className="overflow-x-auto">
                        {sheet.sectionPrefix === 'T'
                            ? <AllListSheet data={data.data} {...sheetProps} filter={activityFilter} />
                            : <BudgetSheet data={data.data} {...sheetProps} sectionPrefix={sheet.sectionPrefix} fyId={data.financial_year.fy_id} quarter={quarter} />}
                    </div>
                )}
            </div>

            {sheet.sectionPrefix !== 'T' && unsectioned.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                    {unsectioned.length} budget line{unsectioned.length === 1 ? ' has' : 's have'} no tracker section, so {unsectioned.length === 1 ? 'it does' : 'they do'} not appear on any sheet. Set one under <Link to="/budget-lines" className="text-green-800 hover:underline">Budget Lines</Link>.
                </p>
            )}

            <MemoFormModal open={card?.kind === 'memo'} memo={card?.kind === 'memo' ? card.memo as Memo | undefined : undefined} onClose={closeCard} />
            <TaskFormModal open={card?.kind === 'task'} task={card?.kind === 'task' ? card.task as Task | undefined : undefined}
                defaultSectionId={card?.kind === 'task' ? card.sectionId : undefined} onClose={closeCard} />
            {data && (card?.kind === 'budget' || card?.kind === 'procurement') && (
                <SheetRowCard open kind={card.kind} data={data.data} fyId={data.financial_year.fy_id} sectionId={card.sectionId} item={card.item}
                    line={card.kind === 'budget' ? card.line : undefined} onClose={closeCard} />
            )}
        </>
    )
}

export default Tracker
