import React from 'react'
import { Link } from 'react-router'
import { useReferenceData } from '../hooks/useReferenceData'
import { useCurrentUser } from '../store/hooks'
import { isAdmin, isSa } from '../utils/permissions'
import PageHeader from '../components/common/PageHeader'
import { LoadingState } from '../components/common/States'

/**
 * The workbook's Lists sheet: every dropdown list, one column each, for everyone
 * to read. Owners, Category, Priority, Acquisition Method and SCM Officers come
 * from the database, so they stay current; the other lists are fixed choices.
 */

// 1, 2, 3 ... up to `last`
const upTo = (last: number) => Array.from({ length: last }, (_, i) => String(i + 1))

const Lists: React.FC = () => {
    const user = useCurrentUser()
    const ref = useReferenceData()
    const values = (items: { value: string }[]) => items.map((item) => item.value)

    const columns: { header: string; values: string[] }[] = [
        { header: 'Owners', values: ref.staff.map((u) => u.full_name) },
        { header: 'Category', values: values(ref.categories) },
        { header: 'Priority', values: values(ref.priorities) },
        { header: 'Status', values: ['Not Started', 'In Progress', 'Cancelled', 'In Review', 'Completed', 'On Hold', 'Escalated', 'Rejected'] },
        { header: 'Escalated', values: ['Yes', 'No'] },
        { header: 'Raise PR', values: ['Raised', 'Not Raised'] },
        { header: 'PR Approval Status', values: ['Approved', 'Pending', 'Rejected', 'Returned for amendment'] },
        { header: 'ToR Preparation', values: ['Not Started', 'In Progress', 'Complete'] },
        { header: 'ToR Approval ICT', values: ['Yes', 'No', 'Pending'] },
        { header: 'Yes/No', values: ['Yes', 'No'] },
        { header: 'Acquisition Method', values: values(ref.acquisitionMethods) },
        { header: 'SCM Officers', values: values(ref.scmOfficers) },
        { header: 'No of Days', values: upTo(60) },
        { header: 'Quantity', values: upTo(200) },
        { header: 'Yes/No/In Progress', values: ['Yes', 'No', 'In Progress'] },
        { header: 'Yes/No/In Review/Rejected/In Progress', values: ['Yes', 'No', 'In Review', 'Rejected', 'In Progress'] },
        { header: 'No of Days (1-90)', values: upTo(90) },
    ]
    const rowCount = Math.max(...columns.map((column) => column.values.length))

    return (
        <>
            <PageHeader
                title="Lists"
                subtitle="The choices used across the tracker. Scroll sideways and down to see them all."
                actions={(isAdmin(user) || isSa(user)) && <Link to="/admin/settings" className="btn btn-sm border-gray-300 bg-white">Edit lists in Settings</Link>}
            />

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
                                        {columns.map((column) => <td key={column.header} className="tabular whitespace-nowrap text-xs">{column.values[row] ?? ''}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}

export default Lists
