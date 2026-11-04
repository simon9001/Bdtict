import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '../../utils/errors'

/**
 * A table cell that edits in place, as a spreadsheet does: click, change, and it
 * saves on Enter or on leaving the cell. Escape cancels. With `canEdit` false it
 * is plain text, so nobody is offered a change the API would refuse.
 */

export type CellValue = string | number | null

interface EditableCellProps {
    label: string                                   // says what the cell is, for screen readers
    value: CellValue
    display?: React.ReactNode                       // how the saved value looks, if not as plain text
    kind?: 'text' | 'number' | 'date' | 'select'
    options?: { value: string | number; label: string }[]
    required?: boolean                              // no blank option
    canEdit: boolean
    onSave: (value: string | null) => Promise<unknown>
}

const inputClass = 'w-full min-w-28 rounded border border-green-700 bg-white px-1.5 py-1 text-xs outline-none ring-2 ring-green-100'

const EditableCell: React.FC<EditableCellProps> = ({ label, value, display, kind = 'text', options = [], required = false, canEdit, onSave }) => {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const [saved, setSaved] = useState<string | null | undefined>(undefined) // shown until the refreshed data arrives
    const cancelled = useRef(false)

    useEffect(() => { setSaved(undefined) }, [value])

    const shownText = (text: CellValue) => {
        if (kind === 'select') return options.find((o) => String(o.value) === String(text))?.label ?? ''
        return text === null ? '' : String(text)
    }

    if (!canEdit) return <>{display ?? (value === null || value === '' ? <span className="text-gray-300">—</span> : String(value))}</>

    const start = () => {
        cancelled.current = false
        setDraft(value === null ? '' : String(value).slice(0, kind === 'date' ? 10 : undefined))
        setEditing(true)
    }

    const commit = async (next: string) => {
        setEditing(false)
        const before = value === null ? '' : String(value).slice(0, kind === 'date' ? 10 : undefined)
        const trimmed = next.trim()
        if (cancelled.current || trimmed === before) return

        setSaved(trimmed || null)
        try {
            await onSave(trimmed || null)
        } catch (error) {
            setSaved(undefined) // back to the stored value
            toast.error(getErrorMessage(error))
        }
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLElement).blur()
        if (e.key === 'Escape') {
            cancelled.current = true
            setEditing(false)
        }
    }

    if (editing) {
        if (kind === 'select') {
            return (
                <select autoFocus aria-label={label} className={inputClass} value={draft}
                    onChange={(e) => { setDraft(e.target.value); void commit(e.target.value) }}
                    onBlur={() => setEditing(false)} onKeyDown={onKeyDown}>
                    {!required && <option value="">—</option>}
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            )
        }
        return (
            <input autoFocus aria-label={label} className={inputClass} type={kind} value={draft}
                onChange={(e) => setDraft(e.target.value)} onBlur={(e) => void commit(e.target.value)} onKeyDown={onKeyDown} />
        )
    }

    const pending = saved !== undefined
    const isEmpty = pending ? saved === null : value === null || value === ''
    return (
        <button type="button" onClick={start} aria-label={`Change ${label}`} title="Click to change"
            className="-mx-1 block w-full min-h-5 cursor-text rounded px-1 text-left hover:bg-green-50 hover:ring-1 hover:ring-green-300 focus:outline-none focus:ring-2 focus:ring-green-400">
            {pending
                ? <span className="opacity-70">{shownText(saved ?? null) || '—'}</span>
                : isEmpty ? <span className="text-gray-300">—</span> : display ?? shownText(value)}
        </button>
    )
}

export default EditableCell
