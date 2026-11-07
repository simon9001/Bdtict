import React, { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { settingsApi } from '../../features/api/SettingsApi'
import type { Lookup, LookupType, StageGroup, WorkflowStage } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { formatDate } from '../../utils/format'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { PrimaryButton } from '../../components/common/Buttons'
import { LoadingState } from '../../components/common/States'
import { inputClass } from '../../components/common/FormField'

/**
 * Settings the Head of ICT manages without a developer:
 *   Dropdown lists   - categories, priorities, acquisition methods, SCM officers
 *   Financial years  - add a year, choose the current one
 *   Workflow steps   - names, order and target days (SLA) of procurement steps
 */

type Tab = 'lookups' | 'years' | 'stages'

const Settings: React.FC = () => {
    const [tab, setTab] = useState<Tab>('lookups')

    return (
        <>
            <PageHeader title="Settings" subtitle="Dropdown lists, financial years and workflow steps" />
            <div role="tablist" className="tabs tabs-box mb-6 w-fit bg-white">
                {([['lookups', 'Dropdown lists'], ['years', 'Financial years'], ['stages', 'Workflow steps']] as const).map(([key, label]) => (
                    <button key={key} role="tab" className={`tab ${tab === key ? 'tab-active' : ''}`} onClick={() => setTab(key)}>{label}</button>
                ))}
            </div>
            {tab === 'lookups' && <LookupSettings />}
            {tab === 'years' && <FinancialYearSettings />}
            {tab === 'stages' && <WorkflowStageSettings />}
        </>
    )
}

// ------------------------------ Dropdown lists -------------------------------

const LOOKUP_GROUPS: { type: LookupType; title: string }[] = [
    { type: 'category', title: 'Categories' },
    { type: 'priority', title: 'Priorities' },
    { type: 'acquisition_method', title: 'Acquisition methods' },
    { type: 'scm_officer', title: 'SCM officers' },
    { type: 'section', title: 'Tracker sections' },
]

const LookupSettings: React.FC = () => {
    const { data, isLoading } = settingsApi.useGetLookupsQuery({ include_inactive: true })
    if (isLoading) return <LoadingState />

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {LOOKUP_GROUPS.map((group) => (
                <LookupGroup key={group.type} type={group.type} title={group.title}
                    items={(data?.data ?? []).filter((l) => l.lookup_type === group.type)} />
            ))}
        </div>
    )
}

const LookupGroup: React.FC<{ type: LookupType; title: string; items: Lookup[] }> = ({ type, title, items }) => {
    const [newValue, setNewValue] = useState('')
    const [createLookup, { isLoading }] = settingsApi.useCreateLookupMutation()
    const [updateLookup] = settingsApi.useUpdateLookupMutation()

    const add = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newValue.trim()) return
        try {
            await createLookup({ lookup_type: type, value: newValue.trim(), sort_order: items.length + 1 }).unwrap()
            setNewValue('')
            toast.success('Value added')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const toggle = async (item: Lookup) => {
        try {
            await updateLookup({ lookup_id: item.lookup_id, is_active: !item.is_active }).unwrap()
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <Card title={title} padded={false}>
            <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                    <li key={item.lookup_id} className="flex items-center justify-between px-5 py-2">
                        <span className={item.is_active ? 'text-gray-900' : 'text-gray-500 line-through'}>{item.value}</span>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500">
                            {item.is_active ? 'In use' : 'Hidden'}
                            <input type="checkbox" className="toggle toggle-sm toggle-success" checked={item.is_active} onChange={() => toggle(item)}
                                aria-label={`${item.is_active ? 'Hide' : 'Show'} ${item.value}`} />
                        </label>
                    </li>
                ))}
            </ul>
            <form onSubmit={add} className="flex gap-2 border-t border-gray-100 p-3">
                <input className={inputClass} placeholder={`Add to ${title.toLowerCase()}`} value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                <PrimaryButton type="submit" icon={<Plus size={16} />} disabled={isLoading || !newValue.trim()}>Add</PrimaryButton>
            </form>
        </Card>
    )
}

// ------------------------------ Financial years ------------------------------

const FinancialYearSettings: React.FC = () => {
    const { data, isLoading } = settingsApi.useGetFinancialYearsQuery()
    const [createYear, { isLoading: creating }] = settingsApi.useCreateFinancialYearMutation()
    const [setCurrent] = settingsApi.useSetCurrentFinancialYearMutation()
    const [startYear, setStartYear] = useState(() => new Date().getFullYear() + 1)

    // Kenyan government FY: 1 July -> 30 June
    const addYear = async () => {
        const code = `${startYear}/${String(startYear + 1).slice(-2)}`
        try {
            await createYear({ code, start_date: `${startYear}-07-01`, end_date: `${startYear + 1}-06-30` }).unwrap()
            toast.success(`FY ${code} added`)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const makeCurrent = async (fyId: number, code: string) => {
        try {
            await setCurrent(fyId).unwrap()
            toast.success(`FY ${code} is now the current year`)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    if (isLoading) return <LoadingState />

    return (
        <Card title="Financial years" padded={false}>
            <table className="table">
                <thead><tr><th>Year</th><th>Starts</th><th>Ends</th><th /></tr></thead>
                <tbody>
                    {data?.data.map((fy) => (
                        <tr key={fy.fy_id}>
                            <td className="font-medium">FY {fy.code}</td>
                            <td>{formatDate(fy.start_date)}</td>
                            <td>{formatDate(fy.end_date)}</td>
                            <td className="text-right">
                                {fy.is_current
                                    ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Current year</span>
                                    : <button className="btn btn-ghost btn-xs" onClick={() => makeCurrent(fy.fy_id, fy.code)}>Make current</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-3 text-sm">
                <span className="text-gray-600">Add FY starting 1 July</span>
                <input type="number" className="input input-sm w-28 border-gray-300" value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} />
                <PrimaryButton icon={<Plus size={16} />} disabled={creating} onClick={addYear}>
                    Add FY {startYear}/{String(startYear + 1).slice(-2)}
                </PrimaryButton>
            </div>
        </Card>
    )
}

// ------------------------------ Workflow steps -------------------------------

const STAGE_GROUPS: StageGroup[] = ['Memo', 'eGP', 'ToR', 'Tender', 'ERP', 'Contract', 'Delivery', 'Closed']

const WorkflowStageSettings: React.FC = () => {
    const { data, isLoading } = settingsApi.useGetWorkflowStagesQuery({ include_inactive: true })
    const [updateStage] = settingsApi.useUpdateWorkflowStageMutation()
    const [createStage, { isLoading: creating }] = settingsApi.useCreateWorkflowStageMutation()
    const [draft, setDraft] = useState({ code: '', name: '', stage_group: 'Memo' as StageGroup, sort_order: 0, sla_days: 5 })

    const save = async (stage: WorkflowStage, changes: Partial<WorkflowStage>) => {
        try {
            await updateStage({ stage_id: stage.stage_id, ...changes }).unwrap()
            toast.success('Step updated')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const add = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await createStage(draft).unwrap()
            toast.success('Step added')
            setDraft({ code: '', name: '', stage_group: 'Memo', sort_order: 0, sla_days: 5 })
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    if (isLoading) return <LoadingState />

    return (
        <Card title="Procurement workflow steps" padded={false}>
            <p className="px-5 pt-3 text-sm text-gray-500">
                Target days drive the "Overdue" flag. Order sets the sequence (gaps of 10 make inserting easy). Hidden steps are skipped.
            </p>
            <div className="overflow-x-auto">
                <table className="table table-sm">
                    <thead><tr><th className="w-20">Order</th><th>Step</th><th>Phase</th><th className="w-28">Target days</th><th>In use</th></tr></thead>
                    <tbody>
                        {data?.data.map((stage) => (
                            <tr key={stage.stage_id} className={stage.is_active ? '' : 'opacity-50'}>
                                <td>
                                    <input type="number" className="input input-xs w-16 border-gray-300" defaultValue={stage.sort_order}
                                        onBlur={(e) => Number(e.target.value) !== stage.sort_order && save(stage, { sort_order: Number(e.target.value) })} />
                                </td>
                                <td>
                                    <input className="input input-xs w-full min-w-56 border-gray-300" defaultValue={stage.name}
                                        onBlur={(e) => e.target.value.trim() && e.target.value !== stage.name && save(stage, { name: e.target.value.trim() })} />
                                </td>
                                <td>
                                    <select className="select select-xs border-gray-300" defaultValue={stage.stage_group}
                                        onChange={(e) => save(stage, { stage_group: e.target.value as StageGroup })}>
                                        {STAGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <input type="number" min={0} className="input input-xs w-20 border-gray-300" defaultValue={stage.sla_days}
                                        onBlur={(e) => Number(e.target.value) !== stage.sla_days && save(stage, { sla_days: Number(e.target.value) })} />
                                </td>
                                <td>
                                    <input type="checkbox" className="toggle toggle-sm toggle-success" checked={stage.is_active}
                                        onChange={() => save(stage, { is_active: !stage.is_active })} aria-label={`Use step ${stage.name}`} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <form onSubmit={add} className="grid grid-cols-2 gap-2 border-t border-gray-100 p-3 md:grid-cols-6">
                <input className={inputClass} placeholder="CODE" value={draft.code} required
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} />
                <input className={`${inputClass} md:col-span-2`} placeholder="Step name" value={draft.name} required
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <select className={inputClass} value={draft.stage_group} onChange={(e) => setDraft({ ...draft, stage_group: e.target.value as StageGroup })}>
                    {STAGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <input type="number" className={inputClass} placeholder="Order" value={draft.sort_order}
                    onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} aria-label="Order" />
                <PrimaryButton type="submit" icon={<Plus size={16} />} disabled={creating}>Add step</PrimaryButton>
            </form>
        </Card>
    )
}

export default Settings
