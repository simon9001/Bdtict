import React from 'react'
import { useNavigate } from 'react-router'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../../features/api/DashboardApi'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import type { DashboardFilters, PipelineStage } from '../../types/Types'
import { formatNumber } from '../../utils/format'
import { drillContext, drillTo } from '../../utils/drill'
import ChartCard, { type TableColumn } from './ChartCard'
import ChartTooltip from './ChartTooltip'
import { BAR_SIZE, CHROME, RADIUS_HORIZONTAL, SERIES, STATUS, tickStyle, legendText } from './chartTheme'

/**
 * "Where are items stuck?"
 * Open procurements per workflow step, in process order. Each bar is split
 * into on-track and overdue (status colour, labelled in the legend).
 * Clicking a bar opens the procurement list filtered to that step.
 */

type Row = PipelineStage & { on_track: number }

const COLUMNS: TableColumn<Row>[] = [
    { key: 'stage_name', label: 'Step' },
    { key: 'items', label: 'Open items', align: 'right', format: (v) => formatNumber(v as number) },
    { key: 'overdue', label: 'Overdue', align: 'right', format: (v) => formatNumber(v as number) },
]

const PipelineChart: React.FC<{ filters: DashboardFilters; className?: string }> = ({ filters, className }) => {
    const navigate = useNavigate()
    const { data, isLoading, error } = dashboardApi.useGetPipelineQuery(filters)

    // Only steps that currently hold items, kept in process order
    const rows: Row[] = (data?.data ?? [])
        .filter((stage) => stage.items > 0)
        .map((stage) => ({ ...stage, on_track: stage.items - stage.overdue }))
    const small = useIsSmallScreen()
    const height = Math.max(200, rows.length * (small ? 52 : 36) + 60)

    // Open items only, as counted here; the overdue part of a bar opens just those
    const context = drillContext(filters, data?.financial_year)
    const stageLink = (row: Row, overdue?: boolean) => drillTo('/procurements', context, {
        open_only: true,
        overdue,
        ...(row.stage_id ? { stage_id: row.stage_id } : { no_stage: true }),
    })

    return (
        <ChartCard
            title="Procurement pipeline"
            subtitle="Open items at each step right now · click a bar to see them"
            isLoading={isLoading}
            error={error}
            isEmpty={rows.length === 0}
            emptyMessage="No open procurements for this selection."
            rows={rows}
            columns={COLUMNS}
            rowLink={(row) => stageLink(row)}
            className={className}
        >
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }} barCategoryGap="28%">
                    <CartesianGrid horizontal={false} stroke={CHROME.grid} />
                    <XAxis type="number" allowDecimals={false} tick={tickStyle} axisLine={{ stroke: CHROME.axis }} tickLine={false} />
                    <YAxis type="category" dataKey="stage_name" width={small ? 96 : 190} tick={tickStyle} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={(props) => <ChartTooltip {...props} formatValue={(v) => formatNumber(v)} />} />
                    <Legend verticalAlign="top" align="left" iconType="square" height={32} formatter={legendText} itemSorter={null} />
                    {/* 2px white stroke = surface gap between the stacked segments */}
                    <Bar isAnimationActive={false} dataKey="on_track" name="On track" stackId="items" fill={SERIES.blue} barSize={BAR_SIZE} stroke="#fff" strokeWidth={2}
                        className="cursor-pointer" onClick={(entry) => navigate(stageLink(entry.payload as Row))} />
                    <Bar isAnimationActive={false} dataKey="overdue" name="Overdue" stackId="items" fill={STATUS.critical} barSize={BAR_SIZE} radius={RADIUS_HORIZONTAL}
                        stroke="#fff" strokeWidth={2} className="cursor-pointer" onClick={(entry) => navigate(stageLink(entry.payload as Row, true))} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    )
}

export default PipelineChart
