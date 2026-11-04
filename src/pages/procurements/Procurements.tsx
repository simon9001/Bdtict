import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search } from 'lucide-react'
import { procurementApi } from '../../features/api/ProcurementApi'
import { useReferenceData } from '../../hooks/useReferenceData'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { useCurrentUser, useSelectedFy } from '../../store/hooks'
import { PROCUREMENT_STATUSES, type ProcurementQuery, type ProcurementStatus } from '../../types/Types'
import { canCreate } from '../../utils/permissions'
import ActiveFilters from '../../components/common/ActiveFilters'
import PageHeader from '../../components/common/PageHeader'
import QuarterSelect from '../../components/common/QuarterSelect'
import { PrimaryButton } from '../../components/common/Buttons'
import StatusBadge from '../../components/common/StatusBadge'
import ProgressBar from '../../components/common/ProgressBar'
import Pagination from '../../components/common/Pagination'
import { EscalatedBadge, OverdueBadge } from '../../components/common/FlagBadges'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import ProcurementFormModal from '../../components/procurements/ProcurementFormModal'

/**
 * All procurements for the selected financial year, with filters.
 * Click a row to open its detail page and record steps.
 */
const Procurements: React.FC = () => {
    const navigate = useNavigate()
    const user = useCurrentUser()
    const fyId = useSelectedFy()
    const { categories, priorities, acquisitionMethods, staff, stages } = useReferenceData()
    const filters = useUrlFilters()
    const [showForm, setShowForm] = useState(false)
    const [searchText, setSearchText] = useState(filters.getString('search') ?? '')

    const query: ProcurementQuery = {
        fy_id: filters.getNumber('fy_id') ?? fyId, // a chart link names the year it counted
        quarter: filters.getNumber('quarter'),
        page: filters.page,
        limit: 25,
        status: filters.getString('status') as ProcurementStatus | undefined,
        category_id: filters.getNumber('category_id'),
        owner_id: filters.getNumber('owner_id'),
        stage_id: filters.getNumber('stage_id'),
        priority_id: filters.getNumber('priority_id'),
        no_priority: filters.getBool('no_priority'),
        acquisition_method_id: filters.getNumber('acquisition_method_id'),
        no_method: filters.getBool('no_method'),
        stage_group: filters.getString('stage_group'),
        no_stage: filters.getBool('no_stage'),
        passed_stage_id: filters.getNumber('passed_stage_id'),
        open_only: filters.getBool('open_only'),
        statuses: filters.getString('statuses'),
        overdue: filters.getBool('overdue'),
        is_escalated: filters.getBool('is_escalated'),
        mine: filters.getBool('mine'),
        search: filters.getString('search'),
        sort: (filters.getString('sort') as ProcurementQuery['sort']) ?? 'newest',
    }

    const { data, isLoading, isFetching, error, refetch } = procurementApi.useGetProcurementsQuery(query)
    const rows = data?.data ?? []

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault()
        filters.setFilters({ search: searchText.trim() })
    }

    return (
        <>
            <PageHeader
                title="Procurements"
                subtitle="Every procurement activity and where it is in the process"
                actions={canCreate(user) && <PrimaryButton icon={<Plus size={16} />} onClick={() => setShowForm(true)}>New procurement</PrimaryButton>}
            />

            {/* Filters - one row above the table */}
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
                <form onSubmit={submitSearch} className="join w-full sm:w-auto">
                    <input className="input input-sm join-item w-full border-gray-300 sm:w-56" placeholder="Search title or reference"
                        value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search" />
                    <button className="btn btn-sm join-item" aria-label="Search"><Search size={16} /></button>
                </form>
                <select className="select select-sm w-full border-gray-300 sm:w-40" value={query.status ?? ''} aria-label="Status"
                    onChange={(e) => filters.setFilters({ status: e.target.value })}>
                    <option value="">All statuses</option>
                    {PROCUREMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-48" value={query.category_id ?? ''} aria-label="Category"
                    onChange={(e) => filters.setFilters({ category_id: e.target.value })}>
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c.lookup_id} value={c.lookup_id}>{c.value}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-44" value={query.owner_id ?? ''} aria-label="Owner"
                    onChange={(e) => filters.setFilters({ owner_id: e.target.value, mine: undefined })}>
                    <option value="">All officers</option>
                    {staff.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-52" value={query.stage_id ?? ''} aria-label="Current step"
                    onChange={(e) => filters.setFilters({ stage_id: e.target.value })}>
                    <option value="">Any step</option>
                    {stages.map((s) => <option key={s.stage_id} value={s.stage_id}>{s.name}</option>)}
                </select>
                <QuarterSelect value={filters.getNumber('quarter')} onChange={(quarter) => filters.setFilters({ quarter })} />
                <select className="select select-sm w-full border-gray-300 sm:w-36" value={query.no_priority ? 'none' : query.priority_id ?? ''} aria-label="Priority"
                    onChange={(e) => filters.setFilters({ priority_id: e.target.value === 'none' ? undefined : e.target.value, no_priority: e.target.value === 'none' })}>
                    <option value="">All priorities</option>
                    {priorities.map((p) => <option key={p.lookup_id} value={p.lookup_id}>{p.value}</option>)}
                    <option value="none">Not set</option>
                </select>
                <select className="select select-sm w-full border-gray-300 sm:w-44" value={query.no_method ? 'none' : query.acquisition_method_id ?? ''} aria-label="Acquisition method"
                    onChange={(e) => filters.setFilters({ acquisition_method_id: e.target.value === 'none' ? undefined : e.target.value, no_method: e.target.value === 'none' })}>
                    <option value="">All methods</option>
                    {acquisitionMethods.map((m) => <option key={m.lookup_id} value={m.lookup_id}>{m.value}</option>)}
                    <option value="none">Not set</option>
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" className="checkbox checkbox-xs" checked={!!query.mine} onChange={(e) => filters.setFilters({ mine: e.target.checked, owner_id: undefined })} />
                    Mine
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" className="checkbox checkbox-xs" checked={!!query.overdue} onChange={(e) => filters.setFilters({ overdue: e.target.checked })} />
                    Overdue
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" className="checkbox checkbox-xs" checked={!!query.is_escalated} onChange={(e) => filters.setFilters({ is_escalated: e.target.checked })} />
                    Escalated
                </label>
                <select className="select select-sm w-full border-gray-300 sm:w-44 sm:ml-auto" value={query.sort} aria-label="Sort"
                    onChange={(e) => filters.setFilters({ sort: e.target.value === 'newest' ? undefined : e.target.value })}>
                    <option value="newest">Newest first</option>
                    <option value="priority">Highest priority</option>
                    <option value="days_in_stage">Longest at step</option>
                    <option value="title">Title A–Z</option>
                </select>
                {filters.hasFilters && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchText(''); filters.clearFilters() }}>Clear</button>
                )}
            </div>

            <ActiveFilters items={[
                query.statuses && `Status: ${query.statuses.replace(',', ', ')}`,
                query.stage_group && `Phase: ${query.stage_group}`,
                query.no_stage && 'Not at any step yet',
                query.passed_stage_id && `Completed step: ${stages.find((s) => s.stage_id === query.passed_stage_id)?.name ?? ''}`,
                query.open_only && 'Open items only',
            ]} />

            {/* Table */}
            <div className={`rounded-lg bg-white shadow-sm transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : rows.length === 0 ? (
                    <EmptyState message="No procurements match these filters." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Procurement</th>
                                    <th className="hidden md:table-cell">Owner</th>
                                    <th className="hidden md:table-cell">Current step</th>
                                    <th className="hidden lg:table-cell text-right">Days at step</th>
                                    <th>Status</th>
                                    <th className="hidden sm:table-cell">Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) => (
                                    <tr key={p.procurement_id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/procurements/${p.procurement_id}`)}>
                                        <td className="max-w-[13rem] sm:max-w-sm">
                                            <p className="truncate font-medium text-gray-900">{p.title}</p>
                                            <p className="truncate text-xs text-gray-500">
                                                {[p.reference, p.category, p.priority].filter(Boolean).join(' · ')}
                                            </p>
                                            {/* Owner and step have their own columns on wider screens */}
                                            <p className="truncate text-xs text-gray-500 md:hidden">
                                                {p.current_stage_name ?? 'Not started'} · {p.owner_name}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {p.is_overdue && <OverdueBadge days={p.days_in_stage} sla={p.sla_days} />}
                                                {p.is_escalated && <EscalatedBadge to={p.escalated_to} />}
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap text-sm">{p.owner_name}</td>
                                        <td className="hidden md:table-cell text-sm">{p.current_stage_name ?? <span className="text-gray-400">Not started</span>}</td>
                                        <td className="hidden lg:table-cell tabular text-right text-sm">
                                            {p.days_in_stage ?? '—'}
                                            {p.sla_days != null && <span className="text-gray-400"> / {p.sla_days}</span>}
                                        </td>
                                        <td><StatusBadge status={p.status} /></td>
                                        <td className="hidden sm:table-cell"><ProgressBar value={p.progress_percent} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination pagination={data?.pagination} onPageChange={(page) => filters.setFilters({ page })} />
            </div>

            <ProcurementFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={(id) => navigate(`/procurements/${id}`)} />
        </>
    )
}

export default Procurements
