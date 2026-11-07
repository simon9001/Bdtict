import React from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { useReferenceData } from '../../hooks/useReferenceData'
import { FormField, inputClass } from './FormField'

interface EscalationFieldsProps {
    flag: UseFormRegisterReturn      // holds "Yes" or "No", as on the sheet
    to: UseFormRegisterReturn
    escalated: boolean
    current?: string | null          // the stored name, kept as a choice if that person has left
}

// The Escalated and Escalated To columns. Like the sheet, it escalates to someone on the staff list.
const EscalationFields: React.FC<EscalationFieldsProps> = ({ flag, to, escalated, current }) => {
    const { staff } = useReferenceData()
    const names = staff.map((u) => u.full_name)

    return (
        <>
            <FormField label="Escalated">
                <select className={inputClass} {...flag}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            </FormField>
            <FormField label="Escalated To">
                <select className={inputClass} disabled={!escalated} {...to}>
                    <option value="">—</option>
                    {current && !names.includes(current) && <option value={current}>{current}</option>}
                    {names.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
            </FormField>
        </>
    )
}

export default EscalationFields
