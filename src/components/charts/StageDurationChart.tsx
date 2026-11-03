import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router'
import { dashboardApi } from '../../features/api/DashboardApi'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import type { DashboardFilters, StageDuration } from '../../types/Types'
import { drillContext, drillTo } from '../../utils/drill'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, RADIUS_HORIZONTAL, SERIES, STATUS, tickStyle } from './chartTheme'

/**
 * "Which step is slowest?"
 * Average days each step takes. A thin dark tick marks the step's target
 * (SLA); bars past their target turn the "serious" status colour, and the
 * legend + table say so in words.
 */

const COLUMNS: TableColumn<StageDuration>[] = [
    { key: 'stage_name', label: 'Step' },
    { key: 'avg_days', label: 'Average days', align: 'right', format: (v) => (v == null ? '—' : String(v)) },
    { key: 'sla_days', label: 'Target days', align: 'right' },
    { key: 'max_days', label: 'Longest', align: 'right', format: (v) => (v == null ? '—' : String(v)) },
    { key: 'samples', label: 'Items measured', align: 'right' },
    { key: 'over_sla', label: 'Over target?', format: (v) => (v ? 'Yes' : 'No') },
]

// Draws the SLA target as a 2px vertical tick at the target value
const TargetTick = (props: { x?: number; y?: number; width?: number; height?: number }) => {
    const { x = 0, y = 0, width = 0, height = 0 } = props
    return <rect x={x + width - 1} y={y - 4} width={2} height={height + 8} fill={CHROME.textPrimary} />
}

const StageDurationChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const { data, isLoading, error } = dashboardApi.useGetStageDurationsQuery(filters)
    const rows = (data?.data ?? []).filter((stage) => stage.samples > 0)
    const small = useIsSmallScreen()
    const navigate = useNavigate()

    // The procurements measured: those that have completed this step
    const stepLink = (row: StageDuration) => drillTo('/procurements', drillContext(filters, data?.financial_year), { passed_stage_id: row.stage_id })
    const height = Math.max(200, rows.length * (small ? 52 : 36) + 40)

    return (
        <ChartCard
            title="Average days per step"
            subtitle="Measured from completed steps · black tick = target days · click a bar to see them"
            isLoading={isLoading}
            error={error}
            isEmpty={rows.length === 0}
            emptyMessage="Not enough completed steps yet to measure durations."
            rows={rows}
            columns={COLUMNS}
            rowLink={stepLink}
            className={className}
            actions={
                <div className="hidden items-center gap-3 text-xs text-gray-600 md:flex">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES.blue }} />Within target</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS.serious }} />Over target</span>
                </div>
            }
        >
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }} barCategoryGap="28%">
                    <CartesianGrid horizontal={false} stroke={CHROME.grid} />
                    <XAxis type="number" allowDecimals={false} tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} unit=" d" />
                    {/* Two category axes on the same rows let the target tick overlay the bar */}
                    <YAxis yAxisId="bars" type="category" dataKey="stage_name" width={small ? 96 : 190} tick={tickStyle} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="targets" type="category" dataKey="stage_name" hide />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        content={(props) => (
                            <ChartTooltip {...props} formatValue={(v) => `${v} days`}
                                extraLine={(row) => `${row.samples} item(s) measured · longest ${row.max_days} days`} />
                        )}
                    />
                    <Bar isAnimationActive={false} yAxisId="bars" dataKey="avg_days" name="Average" barSize={BAR_SIZE} radius={RADIUS_HORIZONTAL} className="cursor-pointer" onClick={(entry) => navigate(stepLink(entry.payload as StageDuration))}>
                        {rows.map((row) => (
                            <Cell key={row.stage_id} fill={row.over_sla ? STATUS.serious : SERIES.blue} />
                        ))}
                    </Bar>
                    <Bar isAnimationActive={false} yAxisId="targets" dataKey="sla_days" name="Target" barSize={BAR_SIZE} fill="transparent" shape={TargetTick} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default StageDurationChart
