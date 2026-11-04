import { toQueryString } from '../features/api/baseApi'
import type { DashboardFilters } from '../types/Types'

/**
 * Links from a chart to the records behind it. Each link carries the year,
 * category and officer the chart is showing, so the list holds the same records
 * the chart counted.
 */

export interface DrillContext {
    fy_id?: number
    category_id?: number
    owner_id?: number
    quarter?: number
}

type DrillParams = Record<string, string | number | boolean | null | undefined>

/** What a chart is showing: its filters, with the year the API actually used */
export const drillContext = (filters: Omit<DashboardFilters, 'fy_id'> & { fy_id?: number }, fy?: { fy_id: number }): DrillContext => ({
    fy_id: fy?.fy_id ?? filters.fy_id,
    category_id: filters.category_id,
    owner_id: filters.owner_id,
    quarter: filters.quarter,
})

/** /procurements?fy_id=2&status=Completed */
export const drillTo = (path: string, context: DrillContext, params: DrillParams = {}): string =>
    `${path}${toQueryString({ ...context, ...params })}`

/** The same link without the year, for lists that are not limited to one */
export const drillWithoutYear = (path: string, context: DrillContext, params: DrillParams = {}): string =>
    drillTo(path, { ...context, fy_id: context.quarter ? context.fy_id : undefined }, params) // a quarter belongs to a year
