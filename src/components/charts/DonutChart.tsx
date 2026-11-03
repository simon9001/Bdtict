import React from 'react'
import { Link, useNavigate } from 'react-router'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatNumber, formatPercent } from '../../utils/format'
import ChartTooltip from './ChartTooltip'
import { CHROME } from './chartTheme'

/**
 * Pie chart with a hole for the total, and every part listed beside it with its
 * figure and share. Parts at zero stay in the list, so it is clear what exists
 * even before there is data for it. With no data at all it shows an empty ring.
 */

export interface DonutSlice {
    name: string
    value: number
    color: string
    href?: string // the records behind this part; parts at zero have nothing to open
}

interface DonutChartProps {
    slices: DonutSlice[]
    centerValue?: string                  // defaults to the total
    centerLabel: string
    formatValue?: (value: number) => string
    stacked?: boolean                     // list under the ring, for narrow cards
}

const DonutChart: React.FC<DonutChartProps> = ({ slices, centerValue, centerLabel, formatValue = formatNumber, stacked = false }) => {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0)
    const parts = slices.filter((slice) => slice.value > 0)
    const navigate = useNavigate()

    const openPart = (index: number) => {
        const href = parts[index]?.href
        if (href) navigate(href)
    }

    return (
        <div className={`flex flex-col items-center gap-4 ${stacked ? '' : 'sm:flex-row'}`}>
            <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        {total === 0 ? (
                            <Pie data={[{ value: 1 }]} dataKey="value" innerRadius="70%" outerRadius="100%" fill={CHROME.grid} stroke="none" isAnimationActive={false} />
                        ) : (
                            <Pie isAnimationActive={false} data={parts} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} paddingAngle={parts.length > 1 ? 2 : 0} stroke="none" className="cursor-pointer" onClick={(_, index) => openPart(index)}>
                                {parts.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                            </Pie>
                        )}
                        {total > 0 && <Tooltip content={(props) => <ChartTooltip {...props} formatValue={formatValue} />} />}
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="tabular max-w-24 text-base font-bold leading-tight text-gray-900">{centerValue ?? formatValue(total)}</span>
                    <span className="max-w-24 text-xs leading-tight text-gray-500">{centerLabel}</span>
                </div>
            </div>

            <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
                {slices.map((slice) => {
                    const row = (
                        <>
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.value > 0 ? slice.color : CHROME.grid }} aria-hidden />
                            <span className={`min-w-0 flex-1 truncate ${slice.value > 0 ? 'text-gray-700' : 'text-gray-500'}`} title={slice.name}>{slice.name}</span>
                            <span className={`tabular whitespace-nowrap font-medium ${slice.value > 0 ? 'text-gray-900' : 'text-gray-500'}`}>{formatValue(slice.value)}</span>
                            <span className="tabular w-11 text-right text-xs text-gray-500">{total > 0 ? formatPercent(Math.round((slice.value / total) * 1000) / 10) : '0%'}</span>
                        </>
                    )
                    return (
                        <li key={slice.name}>
                            {slice.href && slice.value > 0
                                ? <Link to={slice.href} className="-mx-1 flex items-center gap-2 rounded px-1 hover:bg-gray-100">{row}</Link>
                                : <div className="flex items-center gap-2">{row}</div>}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default DonutChart
