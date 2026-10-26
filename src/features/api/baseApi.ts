import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { apiDomain } from '../../apiDomain/ApiDomain'
import { clearCredentials } from '../slice/AuthSlice'
import type { RootState } from '../../store/store'

/**
 * Base RTK Query API.
 *
 * Every feature file (ProcurementApi.ts, InvoiceApi.ts ...) adds its endpoints
 * to this one API with `injectEndpoints`. Sharing one API means:
 *   - one place that attaches the JWT to every request
 *   - one place that logs the user out when the token is rejected (401)
 *   - cache tags work across features (e.g. a new payment refreshes the
 *     invoice, its contract and the dashboard)
 */

const rawBaseQuery = fetchBaseQuery({
    baseUrl: apiDomain,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).authSlice.token
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return headers
    },
})

// Logs the user out when the API says the token is no longer valid
const baseQueryWithLogout: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions)
    const url = typeof args === 'string' ? args : args.url
    if (result.error?.status === 401 && !url.startsWith('auth/login')) {
        api.dispatch(clearCredentials())
    }
    return result
}

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithLogout,
    tagTypes: [
        'Users', 'Lookups', 'FinancialYears', 'WorkflowStages',
        'BudgetLines', 'Procurements', 'Contracts', 'Invoices', 'Payments', 'Tasks',
        'Dashboard', 'AuditLogs',
    ],
    endpoints: () => ({}),
})

/**
 * Turns a filter object into a query string, skipping empty values.
 * { fy_id: 2, search: '', mine: true } -> "?fy_id=2&mine=true"
 */
export const toQueryString = (params: object = {}): string => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
    }
    const query = search.toString()
    return query ? `?${query}` : ''
}
