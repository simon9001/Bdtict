import React, { useState } from 'react'
import { auditApi } from '../../features/api/AuditApi'
import type { AuditLog, AuthEventType } from '../../types/Types'
import { formatDateTime } from '../../utils/format'
import PageHeader from '../../components/common/PageHeader'
import Pagination from '../../components/common/Pagination'
import Modal from '../../components/common/Modal'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'

/**
 * Audit trail for the Head of ICT:
 *   Data changes   - every create / update / delete, with before and after values
 *   Login history  - successful and failed logins, password changes
 * The request id matches the server log files for deeper investigation.
 */
const AuditLogs: React.FC = () => {
    const [tab, setTab] = useState<'changes' | 'logins'>('changes')

    return (
        <>
            <PageHeader title="Audit log" subtitle="Who changed what, and who logged in" />
            <div role="tablist" className="tabs tabs-box mb-6 w-fit bg-white">
                <button role="tab" className={`tab ${tab === 'changes' ? 'tab-active' : ''}`} onClick={() => setTab('changes')}>Data changes</button>
                <button role="tab" className={`tab ${tab === 'logins' ? 'tab-active' : ''}`} onClick={() => setTab('logins')}>Login history</button>
            </div>
            {tab === 'changes' ? <DataChanges /> : <LoginHistory />}
        </>
    )
}

const ENTITIES = ['Procurements', 'StageEvents', 'BudgetLines', 'Contracts', 'Invoices', 'Payments', 'Tasks', 'Users', 'Lookups', 'FinancialYears', 'WorkflowStages']
const ACTION_STYLES = { CREATE: 'bg-green-100 text-green-800', UPDATE: 'bg-blue-100 text-blue-800', DELETE: 'bg-red-100 text-red-800' }

const DataChanges: React.FC = () => {
    const [page, setPage] = useState(1)
    const [entity, setEntity] = useState('')
    const [selected, setSelected] = useState<AuditLog | null>(null)
    const { data, isLoading, error } = auditApi.useGetAuditLogsQuery({ page, limit: 50, entity: entity || undefined })

    return (
        <div className="rounded-lg bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-3">
                <select className="select select-sm w-full border-gray-300 sm:w-52" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1) }} aria-label="Record type">
                    <option value="">All record types</option>
                    {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
            {isLoading ? <LoadingState /> : error ? <ErrorState error={error} /> : (data?.data.length ?? 0) === 0 ? <EmptyState message="No changes recorded." /> : (
                <div className="overflow-x-auto">
                    <table className="table table-sm">
                        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>IP</th><th /></tr></thead>
                        <tbody>
                            {data?.data.map((log) => (
                                <tr key={log.audit_id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                                    <td>{log.user_name ?? '—'}</td>
                                    <td><span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action]}`}>{log.action}</span></td>
                                    <td>{log.entity} #{log.entity_id}</td>
                                    <td className="text-xs text-gray-500">{log.ip_address ?? '—'}</td>
                                    <td className="text-right"><button className="btn btn-ghost btn-xs" onClick={() => setSelected(log)}>Details</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination pagination={data?.pagination} onPageChange={setPage} />

            <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.action} ${selected.entity} #${selected.entity_id}` : ''} size="xl">
                {selected && (
                    <>
                        <p className="mb-3 text-xs text-gray-500">
                            {formatDateTime(selected.created_at)} · {selected.user_name ?? 'system'} · request {selected.request_id ?? '—'}
                        </p>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <JsonBlock title="Before" json={selected.old_values} />
                            <JsonBlock title="After" json={selected.new_values} />
                        </div>
                    </>
                )}
            </Modal>
        </div>
    )
}

// Pretty-prints a stored JSON snapshot
const JsonBlock: React.FC<{ title: string; json: string | null }> = ({ title, json }) => {
    let text = '—'
    if (json) {
        try { text = JSON.stringify(JSON.parse(json), null, 2) } catch { text = json }
    }
    return (
        <div>
            <p className="mb-1 text-sm font-medium text-gray-700">{title}</p>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">{text}</pre>
        </div>
    )
}

const EVENT_LABELS: Record<AuthEventType, { label: string; className: string }> = {
    LOGIN_SUCCESS: { label: 'Login', className: 'bg-green-100 text-green-800' },
    LOGIN_FAILED: { label: 'Failed login', className: 'bg-red-100 text-red-800' },
    PASSWORD_CHANGED: { label: 'Password changed', className: 'bg-blue-100 text-blue-800' },
    PASSWORD_RESET: { label: 'Password reset', className: 'bg-purple-100 text-purple-800' },
}

const LoginHistory: React.FC = () => {
    const [page, setPage] = useState(1)
    const [eventType, setEventType] = useState<AuthEventType | ''>('')
    const { data, isLoading, error } = auditApi.useGetAuthEventsQuery({ page, limit: 50, event_type: eventType || undefined })

    return (
        <div className="rounded-lg bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 p-3">
                <select className="select select-sm w-full border-gray-300 sm:w-52" value={eventType} aria-label="Event type"
                    onChange={(e) => { setEventType(e.target.value as AuthEventType | ''); setPage(1) }}>
                    <option value="">All events</option>
                    {Object.entries(EVENT_LABELS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                </select>
            </div>
            {isLoading ? <LoadingState /> : error ? <ErrorState error={error} /> : (data?.data.length ?? 0) === 0 ? <EmptyState message="No login events yet." /> : (
                <div className="overflow-x-auto">
                    <table className="table table-sm">
                        <thead><tr><th>When</th><th>Event</th><th>User / email</th><th>Reason</th><th>IP</th></tr></thead>
                        <tbody>
                            {data?.data.map((e) => (
                                <tr key={e.event_id}>
                                    <td className="whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                                    <td><span className={`rounded px-2 py-0.5 text-xs font-medium ${EVENT_LABELS[e.event_type].className}`}>{EVENT_LABELS[e.event_type].label}</span></td>
                                    <td>{e.user_name ?? <span className="text-gray-500">{e.email}</span>}</td>
                                    <td className="text-xs text-gray-600">{e.reason?.replace(/_/g, ' ') ?? '—'}</td>
                                    <td className="text-xs text-gray-500">{e.ip_address ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </div>
    )
}

export default AuditLogs
