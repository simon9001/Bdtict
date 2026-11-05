import React, { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, X } from 'lucide-react'
import { settingsApi } from '../features/api/SettingsApi'
import { useReferenceData } from '../hooks/useReferenceData'
import { useCurrentUser } from '../store/hooks'
import type { Lookup, LookupType } from '../types/Types'
import { confirmAction } from '../utils/confirm'
import { getErrorMessage } from '../utils/errors'
import { canCreate, isSa } from '../utils/permissions'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import { IconButton, PrimaryButton } from '../components/common/Buttons'
import { LoadingState } from '../components/common/States'
import { FormActions, FormField, inputClass } from '../components/common/FormField'

/**
 * The workbook's Lists sheet: every dropdown list, one column each.
 * Category, Priority, Acquisition Method and SCM Officers can be changed here, in
 * a card, by anyone who works on the tracker. Owners are the staff accounts, and the other
 * lists are the fixed choices the system's steps and statuses are built on.
 */

// 1, 2, 3 ... up to `last`
const upTo = (last: number) => Array.from({ length: last }, (_, i) => String(i + 1))

const EDITABLE_LISTS: { type: LookupType; label: string }[] = [
    { type: 'category', label: 'Category' },
    { type: 'priority', label: 'Priority' },
    { type: 'acquisition_method', label: 'Acquisition Method' },
    { type: 'scm_officer', label: 'SCM Officers' },
]

type Column = { header: string; values: string[] } | { header: string; lookups: Lookup[] }

const Lists: React.FC = () => {
    const user = useCurrentUser()
    const ref = useReferenceData()
    const [createLookup, { isLoading: adding }] = settingsApi.useCreateLookupMutation()
    const [updateLookup] = settingsApi.useUpdateLookupMutation()
    const [newType, setNewType] = useState<LookupType>('category')
    const [newValue, setNewValue] = useState('')
    const [editing, setEditing] = useState<{ lookup: Lookup; list: string; value: string } | null>(null)
    const [saving, setSaving] = useState(false)
    const canEdit = canCreate(user) || isSa(user)

    const lookupsOf: Record<string, Lookup[]> = {
        category: ref.categories, priority: ref.priorities, acquisition_method: ref.acquisitionMethods, scm_officer: ref.scmOfficers,
    }

    const columns: Column[] = [
        { header: 'Owners', values: ref.staff.map((u) => u.full_name) },
        { header: 'Category', lookups: ref.categories },
        { header: 'Priority', lookups: ref.priorities },
        { header: 'Status', values: ['Not Started', 'In Progress', 'Cancelled', 'In Review', 'Completed', 'On Hold', 'Escalated', 'Rejected'] },
        { header: 'Escalated', values: ['Yes', 'No'] },
        { header: 'Raise PR', values: ['Raised', 'Not Raised'] },
        { header: 'PR Approval Status', values: ['Approved', 'Pending', 'Rejected', 'Returned for amendment'] },
        { header: 'ToR Preparation', values: ['Not Started', 'In Progress', 'Complete'] },
        { header: 'ToR Approval ICT', values: ['Yes', 'No', 'Pending'] },
        { header: 'Yes/No', values: ['Yes', 'No'] },
        { header: 'Acquisition Method', lookups: ref.acquisitionMethods },
        { header: 'SCM Officers', lookups: ref.scmOfficers },
        { header: 'No of Days', values: upTo(60) },
        { header: 'Quantity', values: upTo(200) },
        { header: 'Yes/No/In Progress', values: ['Yes', 'No', 'In Progress'] },
        { header: 'Yes/No/In Review/Rejected/In Progress', values: ['Yes', 'No', 'In Review', 'Rejected', 'In Progress'] },
        { header: 'No of Days (1-90)', values: upTo(90) },
    ]
    const lengthOf = (column: Column) => ('lookups' in column ? column.lookups.length : column.values.length)
    const rowCount = Math.max(...columns.map(lengthOf))

    const add = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newValue.trim()) return
        try {
            await createLookup({ lookup_type: newType, value: newValue.trim(), sort_order: (lookupsOf[newType]?.length ?? 0) + 1 }).unwrap()
            setNewValue('')
            toast.success('Added to the list')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editing || !editing.value.trim()) return
        setSaving(true)
        try {
            await updateLookup({ lookup_id: editing.lookup.lookup_id, value: editing.value.trim() }).unwrap()
            toast.success('Saved')
            setEditing(null)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    const remove = async (lookup: Lookup) => {
        if (!(await confirmAction('Remove from this list?', `"${lookup.value}" will no longer be offered. Records already using it keep it.`))) return
        try {
            await updateLookup({ lookup_id: lookup.lookup_id, is_active: false }).unwrap()
            toast.success('Removed from the list')
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    return (
        <>
            <PageHeader title="Lists" subtitle="The choices used across the tracker. Scroll sideways and down to see them all." />

            {canEdit && (
                <form onSubmit={add} className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Add to</span>
                    <select className="select select-sm w-full border-gray-300 sm:w-48" aria-label="List to add to" value={newType} onChange={(e) => setNewType(e.target.value as LookupType)}>
                        {EDITABLE_LISTS.map((list) => <option key={list.type} value={list.type}>{list.label}</option>)}
                    </select>
                    <input className={`${inputClass} sm:w-64`} aria-label="New value" placeholder="New value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                    <PrimaryButton type="submit" icon={<Plus size={16} />} disabled={adding || !newValue.trim()}>Add</PrimaryButton>
                    <p className="w-full text-xs text-gray-500">
                        Use the pencil beside a value in Category, Priority, Acquisition Method or SCM Officers to change it. Owners are managed under Users by the system administrator. The other columns are fixed because the system's steps and statuses depend on them.
                    </p>
                </form>
            )}

            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                {ref.isLoading ? <LoadingState /> : (
                    <div className="max-h-[70vh] overflow-auto">
                        <table className="table table-sm">
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr>{columns.map((column) => <th key={column.header} className="whitespace-nowrap">{column.header}</th>)}</tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: rowCount }, (_, row) => (
                                    <tr key={row}>
                                        {columns.map((column) => {
                                            const lookup = 'lookups' in column ? column.lookups[row] : undefined
                                            return (
                                                <td key={column.header} className="tabular whitespace-nowrap text-xs">
                                                    {lookup ? (
                                                        <div className="group flex items-center gap-1">
                                                            <span className="min-w-0 flex-1">{lookup.value}</span>
                                                            {canEdit && (
                                                                <IconButton label={`Edit ${lookup.value}`} className="shrink-0" onClick={() => setEditing({ lookup, list: column.header, value: lookup.value })}><Pencil size={12} /></IconButton>
                                                            )}
                                                            {canEdit && (
                                                                <button type="button" aria-label={`Remove ${lookup.value}`} title="Remove from this list" onClick={() => remove(lookup)}
                                                                    className="shrink-0 rounded p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-700 focus:text-red-700">
                                                                    <X size={12} aria-hidden />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : 'values' in column ? (column.values[row] ?? '') : ''}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.list ?? ''} value`} size="md">
                <form onSubmit={saveEdit} className="space-y-4">
                    <FormField label={editing?.list ?? 'Value'} required>
                        <input autoFocus className={inputClass} value={editing?.value ?? ''} onChange={(e) => editing && setEditing({ ...editing, value: e.target.value })} />
                    </FormField>
                    <FormActions onCancel={() => setEditing(null)} isSaving={saving} submitLabel="Save changes" />
                </form>
            </Modal>
        </>
    )
}

export default Lists
