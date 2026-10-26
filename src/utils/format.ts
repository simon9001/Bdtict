/**
 * Display formatting helpers - one place for how money, dates and numbers look.
 */

const kes = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 })
const kesCompact = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat('en-KE')

/** KES 1,250,000 */
export const formatMoney = (value: number | null | undefined): string =>
    value === null || value === undefined ? '—' : kes.format(value)

/** KES 1.3M - for KPI tiles and chart axes */
export const formatMoneyCompact = (value: number | null | undefined): string =>
    value === null || value === undefined ? '—' : kesCompact.format(value)

/** 1,250 */
export const formatNumber = (value: number | null | undefined): string =>
    value === null || value === undefined ? '—' : plain.format(value)

/** 07/09/2026 (DD/MM/YYYY, as used in the department's spreadsheets) */
export const formatDate = (value: string | null | undefined): string => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { timeZone: 'UTC' })
}

/** 07/09/2026, 14:05 */
export const formatDateTime = (value: string | null | undefined): string => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

/** API date -> value for <input type="date"> (YYYY-MM-DD) */
export const toDateInput = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '')

/** Today as YYYY-MM-DD (local time) */
export const todayInput = (): string => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** 42.5% */
export const formatPercent = (value: number | null | undefined): string =>
    value === null || value === undefined ? '—' : `${value.toLocaleString('en-KE', { maximumFractionDigits: 1 })}%`
