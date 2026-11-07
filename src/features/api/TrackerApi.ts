import { baseApi, toQueryString } from './baseApi'
import type { DashboardResponse, TrackerData } from '../../types/Types'

// The workbook's sheets as data. Refreshes whenever anything it shows changes.
export const trackerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getTracker: builder.query<DashboardResponse<TrackerData>, { fy_id?: number }>({
            query: (params) => `tracker${toQueryString(params)}`,
            providesTags: ['BudgetLines', 'Payments', 'Procurements', 'Memos', 'Tasks', 'Lookups', 'WorkflowStages'],
        }),
    }),
})
