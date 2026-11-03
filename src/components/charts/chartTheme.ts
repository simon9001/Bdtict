import { createElement } from 'react'

/**
 * Chart colours and shared Recharts settings.
 *
 * Categorical slots are used in this fixed order and were checked with the
 * dataviz palette validator against the white card surface:
 *   3 slots (budget / contracted / paid)      - all checks pass
 *   4 slots (workload status stack)           - all checks pass
 *   ordinal blue ramp (invoice ageing)        - all checks pass
 * Aqua and yellow sit below 3:1 contrast on white, so every chart also has a
 * table view (ChartCard) - values never depend on colour alone.
 *
 * Colours follow the series, never its rank: "Paid" is always slot 3.
 */

export const SERIES = {
    blue: '#2a78d6',   // slot 1
    orange: '#eb6834', // slot 2
    aqua: '#1baf7a',   // slot 3
    yellow: '#eda100', // slot 4
}

// Fixed meaning for money series across every chart
export const MONEY_COLORS = {
    budget: SERIES.blue,
    contracted: SERIES.orange,
    paid: SERIES.aqua,
    planned: SERIES.blue,
    actual: SERIES.aqua,
}

// Status colours - only where the colour MEANS good/bad, always with a label
export const STATUS = {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
}

/**
 * One colour per status, the same as its badge, on every chart. Neighbouring
 * slices were checked with the dataviz palette validator in this order:
 * Not Started, In Progress, On Hold, In Review, Completed, Rejected. Gray is the
 * deliberate "nothing happening" colour. Charts list every figure next to the
 * colour and have a table view, so nothing depends on colour alone.
 */
const STATUS_COLOR_GROUPS: [string, string[]][] = [
    ['#898781', ['Not Started', 'Open', 'Received', 'Not set']],
    ['#2a78d6', ['In Progress', 'Active']],
    ['#eda100', ['On Hold', 'Expired']],
    ['#6250d6', ['In Review', 'Verified', 'Returned']],
    ['#1baf7a', ['Approved']],
    ['#008300', ['Completed', 'Done', 'Paid']],
    ['#e34948', ['Rejected', 'Terminated']],
    ['#c3c2b7', ['Cancelled']],
]

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
    STATUS_COLOR_GROUPS.flatMap(([color, names]) => names.map((name) => [name, color])),
)

/** All eight categorical slots, in validated order, for lists such as categories */
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

// Ordered (light -> dark) blue steps for ordinal categories such as age buckets
export const ORDINAL_BLUE = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b']

// Chart chrome: recessive hairlines and muted labels
export const CHROME = {
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    tick: '#898781',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
}

// Common axis tick style
export const tickStyle = { fill: CHROME.tick, fontSize: 12 }

// Thin bars with 4px rounded data-ends
export const BAR_SIZE = 12
export const RADIUS_HORIZONTAL: [number, number, number, number] = [0, 4, 4, 0] // bars growing right
export const RADIUS_VERTICAL: [number, number, number, number] = [4, 4, 0, 0]   // columns growing up

/** Legend label renderer - keeps legend text neutral instead of series-coloured */
export const legendText = (value: string) => createElement('span', { style: { color: CHROME.textSecondary, fontSize: 13 } }, value)
