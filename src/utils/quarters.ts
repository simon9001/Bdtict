/**
 * Quarters of the Kenyan financial year (July to June).
 */
export const QUARTERS = [
    { value: 1, label: 'Q1 (Jul-Sep)' },
    { value: 2, label: 'Q2 (Oct-Dec)' },
    { value: 3, label: 'Q3 (Jan-Mar)' },
    { value: 4, label: 'Q4 (Apr-Jun)' },
]

/** First and last day of a quarter, given the year's first day ("2026-07-01") */
export const quarterRange = (fyStart: string, quarter: number): { from: string; to: string } => {
    const [year, month] = fyStart.split('-').map(Number) as [number, number]
    const toIso = (date: Date) => date.toISOString().slice(0, 10)
    return {
        from: toIso(new Date(Date.UTC(year, month - 1 + (quarter - 1) * 3, 1))),
        to: toIso(new Date(Date.UTC(year, month - 1 + quarter * 3, 0))),
    }
}
