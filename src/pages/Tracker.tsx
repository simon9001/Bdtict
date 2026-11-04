import React, { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ExternalLink, Plus } from 'lucide-react'
import { budgetLineApi } from '../features/api/BudgetLineApi'
import { memoApi } from '../features/api/MemoApi'
import { procurementApi } from '../features/api/ProcurementApi'
import { taskApi } from '../features/api/TaskApi'
import { trackerApi } from '../features/api/TrackerApi'
import { useReferenceData } from '../hooks/useReferenceData'
import { useUrlFilters } from '../hooks/useUrlFilters'
import { useCurrentUser, useSelectedFy } from '../store/hooks'
import {
    DG_STATUSES, PROCUREMENT_STATUSES, STAGE_EVENT_STATUSES, TASK_STATUSES,
    type ProcurementFormValues, type StageEventStatus, type TrackerBudgetLine, type TrackerData, type TrackerProcurement,
} from '../types/Types'
import { getErrorMessage } from '../utils/errors'
import { formatDate, formatMoney, todayInput } from '../utils/format'
import { canCreate, canEditOwned, isAdmin } from '../utils/permissions'
import { QUARTERS, quarterRange } from '../utils/quarters'
import ActiveFilters from '../components/common/ActiveFilters'
import EditableCell from '../components/common/EditableCell'
import PageHeader from '../components/common/PageHeader'
import QuarterSelect from '../components/common/QuarterSelect'
import StatusBadge from '../components/common/StatusBadge'
import { ErrorState, LoadingState } from '../components/common/States'
import BudgetLineFormModal from '../components/budget/BudgetLineFormModal'
import MemoFormModal from '../components/memos/MemoFormModal'
import ProcurementFormModal from '../components/procurements/ProcurementFormModal'
import TaskFormModal from '../components/tasks/TaskFormModal'

/**
 * One page per sheet of the workbook, with the sheet's own headers in the sheet's
 * order, and every section and column even when nothing is in them yet.
 *
 * Edits work as in a spreadsheet: click a cell and change it. Officers can change
 * the rows assigned to them and the Head of ICT can change any row (the API
 * enforces the same rule). Total Sum, No of Days and % Complete are worked out.
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
type Options = { value: string | number; label: string }[]

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

const asOptions = (values: readonly string[]): Options => values.map((value) => ({ value, label: value }))
const asIdOptions = (items: { lookup_id: number; value: string }[]): Options => items.map((item) => ({ value: item.lookup_id, label: item.value }))
const toId = (value: string | null) => (value ? Number(value) : null)

/* ----------------------------- Saving from a cell -------------------------- */

// All the saves a sheet can make, plus the choices its dropdowns offer
const useSheetEdits = () => {
    const user = useCurrentUser()
    const ref = useReferenceData()
    const [updateProcurement] = procurementApi.useUpdateProcurementMutation()
    const [createProcurement] = procurementApi.useCreateProcurementMutation()
    const [recordStageEvent] = procurementApi.useRecordStageEventMutation()
    const [updateBudgetLine] = budgetLineApi.useUpdateBudgetLineMutation()
    const [patchAllocation] = budgetLineApi.usePatchAllocationMutation()
    const [updateMemo] = memoApi.useUpdateMemoMutation()
    const [updateTask] = taskApi.useUpdateTaskMutation()

    return {
        canEdit: (ownerId: number) => canEditOwned(user, ownerId),
        canReassign: isAdmin(user),
        options: {
            staff: ref.staff.map((u) => ({ value: u.user_id, label: u.full_name })),
            categories: asIdOptions(ref.categories),
            priorities: asIdOptions(ref.priorities),
            methods: asIdOptions(ref.acquisitionMethods),
            scmOfficers: asIdOptions(ref.scmOfficers),
        },
        saveProcurement: (id: number, patch: Partial<ProcurementFormValues>) => updateProcurement({ procurement_id: id, ...patch }).unwrap(),
        recordStep: (id: number, stageId: number, status: StageEventStatus, date: string) =>
            recordStageEvent({ procurement_id: id, stage_id: stageId, status, event_date: date }).unwrap(),
        saveLine: (id: number, patch: Parameters<typeof updateBudgetLine>[0]) => updateBudgetLine({ ...patch, budget_line_id: id }).unwrap(),
        saveAllocation: (line: TrackerBudgetLine, fyId: number, patch: Partial<TrackerBudgetLine['allocations'][number]>) =>
            patchAllocation({ budget_line_id: line.budget_line_id, fy_id: fyId, ...patch }).unwrap(),
        saveMemo: (id: number, patch: Parameters<typeof updateMemo>[0]) => updateMemo({ ...patch, memo_id: id }).unwrap(),
        saveTask: (id: number, patch: Parameters<typeof updateTask>[0]) => updateTask({ ...patch, task_id: id }).unwrap(),
        startTracking: (line: TrackerBudgetLine, fyId: number) => createProcurement({
            reference: line.code, title: line.description, budget_line_id: line.budget_line_id, fy_id: fyId,
            owner_id: isAdmin(user) ? line.owner_id : undefined, category_id: line.category_id, priority_id: line.priority_id,
            section_id: line.section_id, status: 'Not Started', is_escalated: false,
        }).unwrap(),
    }
}

type SheetEdits = ReturnType<typeof useSheetEdits>

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

// A step's status and date. Saving adds to the procurement's history, which keeps earlier updates.
const StepEditor: React.FC<{ stage: Stage; item: TrackerProcurement; edits: SheetEdits; onClose: () => void }> = ({ stage, item, edits, onClose }) => {
    const step = item.steps[stage.code]
    const [status, setStatus] = useState<StageEventStatus>(step?.status ?? 'Completed')
    const [date, setDate] = useState(step?.event_date?.slice(0, 10) ?? todayInput())
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            await edits.recordStep(item.procurement_id, stage.stage_id, status, date)
            toast.success('Step saved')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
            setSaving(false)
        }
    }

    return (
        <div className="flex min-w-36 flex-col gap-1" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
            <select autoFocus aria-label={`${stage.name} status`} className="rounded border border-green-700 bg-white px-1 py-0.5 text-xs" value={status} onChange={(e) => setStatus(e.target.value as StageEventStatus)}>
                {STAGE_EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" aria-label={`${stage.name} date`} className="rounded border border-green-700 bg-white px-1 py-0.5 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex gap-1">
                <button type="button" className="btn btn-xs flex-1 border-0 bg-green-800 text-white hover:bg-green-900" disabled={saving || !date} onClick={save}>Save</button>
                <button type="button" className="btn btn-xs btn-ghost" onClick={onClose}>Cancel</button>
            </div>
        </div>
    )
}

const StepCell: React.FC<{ stage: Stage; item?: TrackerProcurement; edits: SheetEdits; editable: boolean }> = ({ stage, item, edits, editable }) => {
    const [editing, setEditing] = useState(false)
    const step = item?.steps[stage.code]

    // The two tender dates are fields of their own; saving one also records the step
    if (item && (stage.code === 'TENDER_FLOATED' || stage.code === 'TENDER_OPENED')) {
        const field = stage.code === 'TENDER_FLOATED' ? 'tender_float_date' : 'tender_opening_date'
        const value = item[field] ?? step?.event_date ?? null
        return (
            <td className={cell}>
                <EditableCell label={STEP_HEADERS[stage.code] ?? stage.name} kind="date" value={value} display={<DateText value={value} />} canEdit={editable}
                    onSave={async (date) => {
                        await edits.saveProcurement(item.procurement_id, { [field]: date })
                        if (date) await edits.recordStep(item.procurement_id, stage.stage_id, 'Completed', date)
                    }} />
            </td>
        )
    }
    if (stage.code === 'TENDER_FLOATED' || stage.code === 'TENDER_OPENED') return <td className={cell}><Empty /></td>

    if (editing && item) return <td className={cell}><StepEditor stage={stage} item={item} edits={edits} onClose={() => setEditing(false)} /></td>

    const content = step ? (
        <>
            <p className={`font-medium ${STEP_TONES[step.status] ?? 'text-gray-700'}`}>{step.status}</p>
            <p className="tabular text-gray-500">{formatDate(step.event_date)}</p>
        </>
    ) : <Empty />

    return (
        <td className={cell}>
            {editable && item ? (
                <button type="button" onClick={() => setEditing(true)} aria-label={`Change ${stage.name}`} title="Click to change"
                    className="-mx-1 block min-h-5 w-full cursor-text rounded px-1 text-left hover:bg-green-50 hover:ring-1 hover:ring-green-300 focus:outline-none focus:ring-2 focus:ring-green-400">
                    {content}
                </button>
            ) : content}
        </td>
    )
}

const ProcessCells: React.FC<{ sheetStages: Stage[]; extraStages: Stage[]; item?: TrackerProcurement; edits: SheetEdits }> = ({ sheetStages, extraStages, item, edits }) => {
    const editable = !!item && edits.canEdit(item.owner_id)
    const save = (patch: Partial<ProcurementFormValues>) => edits.saveProcurement(item!.procurement_id, patch)

    return (
        <>
            {sheetStages.map((stage) => (
                <React.Fragment key={stage.code}>
                    <StepCell stage={stage} item={item} edits={edits} editable={editable} />
                    {stage.code === SCM_OFFICER_AFTER && (
                        <td className={cell}>
                            <EditableCell label="SCM Officer Allocated" kind="select" options={edits.options.scmOfficers} value={item?.scm_officer_id ?? null}
                                display={<Text value={item?.scm_officer} />} canEdit={editable} onSave={(v) => save({ scm_officer_id: toId(v) })} />
                        </td>
                    )}
                    {stage.code === METHOD_AFTER && (
                        <td className={cell}>
                            <EditableCell label="Acquisition method" kind="select" options={edits.options.methods} value={item?.acquisition_method_id ?? null}
                                display={<Text value={item?.acquisition_method} />} canEdit={editable} onSave={(v) => save({ acquisition_method_id: toId(v) })} />
                        </td>
                    )}
                    {stage.code === DAYS_AFTER && <td className={`${cell} tabular`}><Text value={item?.tender_days} /></td>}
                </React.Fragment>
            ))}
            <td className={cell}>
                {item ? (
                    <EditableCell label="Escalated" kind="select" required options={asOptions(['Yes', 'No'])} value={item.is_escalated ? 'Yes' : 'No'}
                        display={item.is_escalated ? <span className="font-medium text-orange-700">Yes</span> : 'No'} canEdit={editable}
                        onSave={(v) => save({ is_escalated: v === 'Yes' })} />
                ) : <Empty />}
            </td>
            <td className={cell}>
                <EditableCell label="Escalated To" value={item?.escalated_to ?? null} canEdit={editable && !!item?.is_escalated} onSave={(v) => save({ escalated_to: v })} />
            </td>
            <td className={`${cell} tabular text-right`}>{item ? `${item.progress_percent ?? 0}%` : <Empty />}</td>
            <td className="min-w-48 text-xs">
                <EditableCell label="Notes" value={item?.notes ?? null} canEdit={editable} onSave={(v) => save({ notes: v })} />
            </td>
            {extraStages.map((stage) => <StepCell key={stage.code} stage={stage} item={item} edits={edits} editable={editable} />)}
        </>
    )
}

// Shaded header row of a section, like the sheet's, with a button to add a row to it
const SectionRow: React.FC<{ name: string; columns: number; count: number; onAdd?: () => void }> = ({ name, columns, count, onAdd }) => (
    <tr className="bg-green-50">
        <td colSpan={columns} className="text-xs font-semibold text-green-900">
            <span className="sticky left-3 inline-flex items-center gap-2">
                {name}
                <span className="font-normal text-gray-600">{count === 0 ? 'Nothing recorded yet' : `${count} item${count === 1 ? '' : 's'}`}</span>
                {onAdd && (
                    <button type="button" onClick={onAdd} className="btn btn-xs border-green-700 bg-white text-green-900 hover:bg-green-100">
                        <Plus size={12} aria-hidden />Add
                    </button>
                )}
            </span>
        </td>
    </tr>
)

// Editable title, with a small link to the record's own page
const TitleCell: React.FC<{ title: string; to: string; canEdit: boolean; label: string; onSave: (value: string | null) => Promise<unknown> }> = ({ title, to, canEdit, label, onSave }) => (
    <td className={titleCell}>
        <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1 whitespace-normal">
                <EditableCell label={label} value={title} display={canEdit ? title : <Link to={to} className="hover:underline">{title}</Link>} canEdit={canEdit} onSave={onSave} />
            </div>
            {canEdit && <Link to={to} aria-label={`Open ${title}`} title="Open" className="mt-0.5 shrink-0 text-gray-400 hover:text-green-800"><ExternalLink size={13} aria-hidden /></Link>}
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

// The dashboard counts an open task as Not Started and a done one as Completed
const taskActivityStatus = (status: string) => (status === 'Open' ? 'Not Started' : status === 'Done' ? 'Completed' : status)

// What a new row in each All list section is
const newRowKind = (sectionName: string): 'memo' | 'task' | 'procurement' => {
    if (sectionName.startsWith('T-001')) return 'memo'
    return /^T-00[2-5]/.test(sectionName) ? 'task' : 'procurement'
}

interface SheetProps {
    data: TrackerData
    edits: SheetEdits
    onAdd?: (kind: 'memo' | 'task' | 'procurement' | 'budget', sectionId: number) => void
}

const AllListSheet: React.FC<SheetProps & { filter: ActivityFilter }> = ({ data, edits, onAdd, filter }) => {
    const isFiltered = Object.values(filter).some(Boolean)
    const today = new Date().toISOString().slice(0, 10)
    const matches = (row: { status: string; priority: string | null; owner_name: string; category?: string }) =>
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
    const process = { sheetStages, extraStages, edits }
    const { options } = edits

    const stageOf = (code: string) => data.stages.find((s) => s.code === code)

    return (
        <table className="table table-sm">
            <thead>
                <tr>
                    <th className="whitespace-nowrap">Task ID</th>
                    <th className={titleHeader}>Task Name / Activity</th>
                    {['Owner', 'Category', 'Priority', 'Delivery Day to DG', 'Day Approved by DG', 'DG Approval Status', 'Memo Status'].map((header) => <th key={header} className="whitespace-nowrap">{header}</th>)}
                    <ProcessHeaders sheetStages={sheetStages} extraStages={extraStages} />
                </tr>
            </thead>
            <tbody>
                {groups.map((group) => {
                    const inGroup = (id: number | null) => (group.id === null ? id === null || !sectionIds.has(id) : id === group.id)
                    const memos = (group.id === memoSection ? data.memos : []).filter((m) => matches(m) && inRange(m.delivered_date)
                        && (!filter.overdue || (!!m.approved_date && m.approved_date.slice(0, 10) < today && m.status !== 'Completed'))
                        && !filter.escalated)
                    const items = standalone.filter((p) => inGroup(p.section_id) && matches(p) && !filter.overdue && (!filter.escalated || p.is_escalated)
                        && (!filter.range || Object.values(p.steps).some((step) => inRange(step.event_date))))
                    const tasks = data.tasks.filter((t) => inGroup(t.section_id)
                        && matches({ ...t, status: taskActivityStatus(t.status) })
                        && inRange(t.due_date ?? t.created_at)
                        && !filter.category && !filter.overdue && !filter.escalated)
                    const count = memos.length + items.length + tasks.length
                    // Empty sections stay on the sheet, but not when looking for something specific
                    if ((group.id === null || isFiltered) && count === 0) return null

                    return (
                        <React.Fragment key={group.name}>
                            <SectionRow name={group.name} columns={columns} count={count}
                                onAdd={onAdd && group.id !== null ? () => onAdd(newRowKind(group.name), group.id as number) : undefined} />
                            {memos.map((memo) => {
                                const editable = edits.canEdit(memo.owner_id)
                                const save = (patch: Omit<Parameters<SheetEdits['saveMemo']>[1], 'memo_id'>) => edits.saveMemo(memo.memo_id, patch as Parameters<SheetEdits['saveMemo']>[1])
                                return (
                                    <tr key={`memo-${memo.memo_id}`} className="hover:bg-gray-50">
                                        <td className={`${cell} tabular`}><EditableCell label="Task ID" value={memo.reference} canEdit={editable} onSave={(v) => save({ reference: v })} /></td>
                                        <TitleCell title={memo.title} to="/memos" label="Task name" canEdit={editable} onSave={(v) => save({ title: v ?? memo.title })} />
                                        <td className={cell}><EditableCell label="Owner" kind="select" required options={options.staff} value={memo.owner_id} display={memo.owner_name} canEdit={editable && edits.canReassign} onSave={(v) => save({ owner_id: Number(v) })} /></td>
                                        <td className={cell}><EditableCell label="Category" kind="select" required options={options.categories} value={memo.category_id} display={memo.category} canEdit={editable} onSave={(v) => save({ category_id: Number(v) })} /></td>
                                        <td className={cell}><EditableCell label="Priority" kind="select" options={options.priorities} value={memo.priority_id} display={<Text value={memo.priority} />} canEdit={editable} onSave={(v) => save({ priority_id: toId(v) })} /></td>
                                        <td className={cell}><EditableCell label="Delivery Day to DG" kind="date" value={memo.delivered_date} display={<DateText value={memo.delivered_date} />} canEdit={editable} onSave={(v) => save({ delivered_date: v })} /></td>
                                        <td className={cell}><EditableCell label="Day Approved by DG" kind="date" value={memo.approved_date} display={<DateText value={memo.approved_date} />} canEdit={editable} onSave={(v) => save({ approved_date: v })} /></td>
                                        <td className={cell}><EditableCell label="DG Approval Status" kind="select" options={asOptions(DG_STATUSES)} value={memo.dg_status} display={memo.dg_status ? <StatusBadge status={memo.dg_status} /> : <Empty />} canEdit={editable} onSave={(v) => save({ dg_status: v as typeof memo.dg_status })} /></td>
                                        <td className={cell}><EditableCell label="Memo Status" kind="select" required options={asOptions(PROCUREMENT_STATUSES)} value={memo.status} display={<StatusBadge status={memo.status} />} canEdit={editable} onSave={(v) => save({ status: v as typeof memo.status })} /></td>
                                        <ProcessCells {...process} />
                                    </tr>
                                )
                            })}
                            {items.map((item) => {
                                const editable = edits.canEdit(item.owner_id)
                                const save = (patch: Partial<ProcurementFormValues>) => edits.saveProcurement(item.procurement_id, patch)
                                const memoDelivered = stageOf('MEMO_TO_DG')
                                const memoApproved = stageOf('DG_APPROVAL')
                                return (
                                    <tr key={`procurement-${item.procurement_id}`} className="hover:bg-gray-50">
                                        <td className={`${cell} tabular`}><EditableCell label="Task ID" value={item.reference} canEdit={editable} onSave={(v) => save({ reference: v })} /></td>
                                        <TitleCell title={item.title} to={`/procurements/${item.procurement_id}`} label="Task name" canEdit={editable} onSave={(v) => save({ title: v ?? item.title })} />
                                        <td className={cell}><EditableCell label="Owner" kind="select" required options={options.staff} value={item.owner_id} display={item.owner_name} canEdit={editable && edits.canReassign} onSave={(v) => save({ owner_id: Number(v) })} /></td>
                                        <td className={cell}><EditableCell label="Category" kind="select" required options={options.categories} value={item.category_id} display={item.category} canEdit={editable} onSave={(v) => save({ category_id: Number(v) })} /></td>
                                        <td className={cell}><EditableCell label="Priority" kind="select" options={options.priorities} value={item.priority_id} display={<Text value={item.priority} />} canEdit={editable} onSave={(v) => save({ priority_id: toId(v) })} /></td>
                                        <td className={cell}><EditableCell label="Delivery Day to DG" kind="date" value={item.steps.MEMO_TO_DG?.event_date ?? null} display={<DateText value={item.steps.MEMO_TO_DG?.event_date} />} canEdit={editable && !!memoDelivered}
                                            onSave={async (v) => { if (v && memoDelivered) await edits.recordStep(item.procurement_id, memoDelivered.stage_id, 'Completed', v) }} /></td>
                                        <td className={cell}><EditableCell label="Day Approved by DG" kind="date" value={item.steps.DG_APPROVAL?.event_date ?? null} display={<DateText value={item.steps.DG_APPROVAL?.event_date} />} canEdit={editable && !!memoApproved}
                                            onSave={async (v) => { if (v && memoApproved) await edits.recordStep(item.procurement_id, memoApproved.stage_id, 'Approved', v) }} /></td>
                                        <td className={cell}><Text value={item.steps.DG_APPROVAL?.status} /></td>
                                        <td className={cell}><EditableCell label="Memo Status" kind="select" required options={asOptions(PROCUREMENT_STATUSES)} value={item.status} display={<StatusBadge status={item.status} />} canEdit={editable} onSave={(v) => save({ status: v as ProcurementFormValues['status'] })} /></td>
                                        <ProcessCells {...process} item={item} />
                                    </tr>
                                )
                            })}
                            {tasks.map((task) => {
                                const editable = edits.canEdit(task.owner_id)
                                const save = (patch: Omit<Parameters<SheetEdits['saveTask']>[1], 'task_id'>) => edits.saveTask(task.task_id, patch as Parameters<SheetEdits['saveTask']>[1])
                                return (
                                    <tr key={`task-${task.task_id}`} className="hover:bg-gray-50">
                                        <td className={cell}><Empty /></td>
                                        <TitleCell title={task.title} to="/tasks?all=true" label="Task name" canEdit={editable} onSave={(v) => save({ title: v ?? task.title })} />
                                        <td className={cell}><EditableCell label="Owner" kind="select" required options={options.staff} value={task.owner_id} display={task.owner_name} canEdit={editable && edits.canReassign} onSave={(v) => save({ owner_id: Number(v) })} /></td>
                                        <td className={cell}><Empty /></td>
                                        <td className={cell}><EditableCell label="Priority" kind="select" options={options.priorities} value={task.priority_id} display={<Text value={task.priority} />} canEdit={editable} onSave={(v) => save({ priority_id: toId(v) })} /></td>
                                        <td className={cell}><Empty /></td>
                                        <td className={cell}><Empty /></td>
                                        <td className={cell}><Empty /></td>
                                        <td className={cell}><EditableCell label="Status" kind="select" required options={asOptions(TASK_STATUSES)} value={task.status} display={<StatusBadge status={task.status} />} canEdit={editable} onSave={(v) => save({ status: v as typeof task.status })} /></td>
                                        <ProcessCells {...process} />
                                    </tr>
                                )
                            })}
                        </React.Fragment>
                    )
                })}
            </tbody>
        </table>
    )
}

/* ----------------------------- Budget line sheets -------------------------- */

const QUARTER_FIELDS = ['q1_amount', 'q2_amount', 'q3_amount', 'q4_amount'] as const

const BudgetSheet: React.FC<SheetProps & { sectionPrefix: string; fyId: number; quarter?: number }> = ({ data, edits, onAdd, sectionPrefix, fyId, quarter }) => {
    const { sheetStages, extraStages } = splitStages(data.stages, true)
    const sections = data.sections.filter((s) => s.name.startsWith(sectionPrefix))
    const process = { sheetStages, extraStages, edits }
    const { options } = edits

    // Years nothing has been planned in (such as a past one) get no column
    const years = data.financial_years.filter((fy) => fy.fy_id === fyId || data.budget_lines.some((l) => l.allocations.some((a) => a.fy_id === fy.fy_id)))
    const columns = 7 + years.length + 5 + processColumnCount(sheetStages, extraStages)
    const money = (value?: number) => (value ? <span className="tabular">{formatMoney(value)}</span> : <Empty />)

    const row = (line: TrackerBudgetLine) => {
        const procurement = data.procurements.find((p) => p.budget_line_id === line.budget_line_id)
        const thisYear = line.allocations.find((a) => a.fy_id === fyId)
        const editable = edits.canEdit(line.owner_id)
        const save = (patch: Record<string, unknown>) => edits.saveLine(line.budget_line_id, patch as Parameters<SheetEdits['saveLine']>[1])
        const amount = (label: string, value: number | undefined, year: number, field: 'planned_amount' | 'q1_amount' | 'q2_amount' | 'q3_amount' | 'q4_amount') => (
            <EditableCell label={label} kind="number" value={value || null} display={money(value)} canEdit={editable}
                onSave={(v) => edits.saveAllocation(line, year, { [field]: Number(v ?? 0) })} />
        )

        return (
            <tr key={line.budget_line_id} className="hover:bg-gray-50">
                <td className={`${cell} tabular`}><EditableCell label="Category ID" value={line.code} canEdit={editable} onSave={(v) => save({ code: v })} /></td>
                <TitleCell title={line.description} to={`/budget-lines/${line.budget_line_id}`} label="Asset Description" canEdit={editable} onSave={(v) => save({ description: v ?? line.description })} />
                <td className={cell}><EditableCell label="Category" kind="select" required options={options.categories} value={line.category_id} display={line.category} canEdit={editable} onSave={(v) => save({ category_id: Number(v) })} /></td>
                <td className={`${cell} tabular text-right`}><EditableCell label="Quantity" kind="number" value={line.quantity} canEdit={editable} onSave={(v) => save({ quantity: Number(v) })} /></td>
                <td className={`${cell} text-right`}><EditableCell label="Price per unit" kind="number" value={line.unit_price} display={money(line.unit_price)} canEdit={editable} onSave={(v) => save({ unit_price: Number(v ?? 0) })} /></td>
                <td className={`${cell} text-right`}>{money(line.total_amount)}</td>
                <td className={cell}><EditableCell label="Officer Assigned" kind="select" required options={options.staff} value={line.owner_id} display={line.owner_name} canEdit={editable && edits.canReassign} onSave={(v) => save({ owner_id: Number(v) })} /></td>
                {years.map((fy) => (
                    <td key={fy.fy_id} className={`${cell} text-right`}>
                        {amount(`Expenditure FY ${fy.code}`, line.allocations.find((a) => a.fy_id === fy.fy_id)?.planned_amount, fy.fy_id, 'planned_amount')}
                    </td>
                ))}
                <td className={`${cell} text-right`}>{amount('Expenditure Q1', thisYear?.q1_amount, fyId, 'q1_amount')}</td>
                <td className={`${cell} text-right`}>{amount('Expenditure Q2', thisYear?.q2_amount, fyId, 'q2_amount')}</td>
                <td className={`${cell} text-right`}>{amount('Expenditure Q3', thisYear?.q3_amount, fyId, 'q3_amount')}</td>
                <td className={`${cell} text-right`}>{amount('Expenditure Q4', thisYear?.q4_amount, fyId, 'q4_amount')}</td>
                <td className={cell}><EditableCell label="Priority" kind="select" options={options.priorities} value={line.priority_id} display={<Text value={line.priority} />} canEdit={editable} onSave={(v) => save({ priority_id: toId(v) })} /></td>
                <ProcessCells {...process} item={procurement} />
            </tr>
        )
    }

    // A new budget line has nothing to hold its process columns until tracking starts
    const untracked = (line: TrackerBudgetLine) => !data.procurements.some((p) => p.budget_line_id === line.budget_line_id) && edits.canEdit(line.owner_id)

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
                    <ProcessHeaders sheetStages={sheetStages} extraStages={extraStages} />
                </tr>
            </thead>
            <tbody>
                {sections.map((section) => {
                    const lines = data.budget_lines.filter((l) => {
                        if (l.section_id !== section.section_id) return false
                        const field = quarter ? QUARTER_FIELDS[quarter - 1] : undefined
                        return !field || (l.allocations.find((a) => a.fy_id === fyId)?.[field] ?? 0) > 0
                    })
                    return (
                        <React.Fragment key={section.section_id}>
                            <SectionRow name={section.name} columns={columns} count={lines.length} onAdd={onAdd ? () => onAdd('budget', section.section_id) : undefined} />
                            {lines.map((line) => (
                                <React.Fragment key={line.budget_line_id}>
                                    {row(line)}
                                    {untracked(line) && (
                                        <tr>
                                            <td colSpan={columns} className="text-xs text-gray-600">
                                                <span className="sticky left-3 inline-flex items-center gap-2">
                                                    {line.description} is not being tracked yet.
                                                    <button type="button" className="btn btn-xs border-green-700 bg-white text-green-900 hover:bg-green-100"
                                                        onClick={() => edits.startTracking(line, fyId).catch((error) => toast.error(getErrorMessage(error)))}>
                                                        Start tracking
                                                    </button>
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
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
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const filters = useUrlFilters()
    const { categories, staff } = useReferenceData()
    const edits = useSheetEdits()
    const { data, isLoading, error, refetch } = trackerApi.useGetTrackerQuery({ fy_id: filters.getNumber('fy_id') ?? fyId })
    const [adding, setAdding] = useState<{ kind: 'memo' | 'task' | 'procurement' | 'budget'; sectionId: number } | null>(null)
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
    const onAdd = canCreate(user) ? (kind: 'memo' | 'task' | 'procurement' | 'budget', sectionId: number) => setAdding({ kind, sectionId }) : undefined

    return (
        <>
            <PageHeader title={sheet.title} subtitle={`Financial year ${data?.financial_year.code ?? ''}. Scroll sideways to see every column.`} />

            {canCreate(user) && (
                <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
                    Click a cell to change it. {isAdmin(user) ? 'You can change any row.' : 'You can change the rows assigned to you.'} Total Sum, No of Days and % Complete are worked out for you.
                </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <span className="text-sm font-medium text-gray-600">Filter:</span>
                <QuarterSelect value={quarter} onChange={(value) => filters.setFilters({ quarter: value })} />
                <span className="text-xs text-gray-500">
                    {sheet.sectionPrefix === 'T' ? 'Memos delivered, tasks due and activities with a step recorded in the quarter' : 'Budget lines with a plan entered for the quarter'}
                </span>
            </div>

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
                            ? <AllListSheet data={data.data} edits={edits} onAdd={onAdd} filter={activityFilter} />
                            : <BudgetSheet data={data.data} edits={edits} onAdd={onAdd} sectionPrefix={sheet.sectionPrefix} fyId={data.financial_year.fy_id} quarter={quarter} />}
                    </div>
                )}
            </div>

            {sheet.sectionPrefix !== 'T' && unsectioned.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                    {unsectioned.length} budget line{unsectioned.length === 1 ? ' has' : 's have'} no tracker section, so {unsectioned.length === 1 ? 'it does' : 'they do'} not appear on any sheet. Set one under <Link to="/budget-lines" className="text-green-800 hover:underline">Budget Lines</Link>.
                </p>
            )}

            <MemoFormModal open={adding?.kind === 'memo'} onClose={() => setAdding(null)} />
            <TaskFormModal open={adding?.kind === 'task'} defaultSectionId={adding?.sectionId} onClose={() => setAdding(null)} />
            <ProcurementFormModal open={adding?.kind === 'procurement'} defaultSectionId={adding?.sectionId} onClose={() => setAdding(null)} />
            <BudgetLineFormModal open={adding?.kind === 'budget'} defaultSectionId={adding?.sectionId} onClose={() => setAdding(null)} />
        </>
    )
}

export default Tracker
