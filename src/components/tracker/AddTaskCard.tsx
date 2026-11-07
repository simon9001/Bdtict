import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { settingsApi } from '../../features/api/SettingsApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { getErrorMessage } from '../../utils/errors'
import { FormActions, FormField, inputClass } from '../common/FormField'
import Modal from '../common/Modal'

/**
 * Card behind the All list's Add button: a new task header such as "T-008 - Follow
 * up on licences". Its data is then added with the + on that header.
 */

const nextTaskId = (names: string[]) => {
    const numbers = names.map((name) => Number(name.match(/^T-(\d+)/)?.[1] ?? 0))
    return `T-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`
}

const AddTaskCard: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const { sections } = useReferenceData()
    const [createLookup, { isLoading }] = settingsApi.useCreateLookupMutation()
    const [taskId, setTaskId] = useState('')
    const [name, setName] = useState('')

    useEffect(() => {
        if (!open) return
        setTaskId(nextTaskId(sections.map((s) => s.value)))
        setName('')
    }, [open, sections])

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        const id = taskId.trim().toUpperCase()
        if (!/^T-\d+$/.test(id)) return void toast.error('The Task ID looks like T-008')
        if (sections.some((s) => s.value.startsWith(`${id} - `))) return void toast.error(`${id} is already in use`)
        try {
            const sortOrder = Math.max(0, ...sections.map((s) => s.sort_order)) + 1
            await createLookup({ lookup_type: 'section', value: `${id} - ${name.trim()}`, sort_order: sortOrder }).unwrap()
            toast.success('Task added. Use the + on its header to add its data.')
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Add new task" size="md">
            <form onSubmit={save} className="space-y-4">
                <FormField label="Task ID" required>
                    <input className={inputClass} value={taskId} onChange={(e) => setTaskId(e.target.value)} required />
                </FormField>
                <FormField label="Task name" required>
                    <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                </FormField>
                <FormActions onCancel={onClose} isSaving={isLoading} submitLabel="Add task" />
            </form>
        </Modal>
    )
}

export default AddTaskCard
