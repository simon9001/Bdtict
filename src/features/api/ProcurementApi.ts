import { baseApi, toQueryString } from './baseApi'
import type {
    ApiResponse, PaginatedResponse, Procurement, ProcurementDetail, ProcurementFormValues, ProcurementQuery, StageEventFormValues,
} from '../../types/Types'

// Procurements and their workflow step history
export const procurementApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Paginated list with filters
        getProcurements: builder.query<PaginatedResponse<Procurement>, ProcurementQuery>({
            query: (params) => `procurements${toQueryString(params)}`,
            providesTags: ['Procurements'],
        }),

        // One procurement with history, contracts and open tasks
        getProcurementById: builder.query<ApiResponse<ProcurementDetail>, number>({
            query: (id) => `procurements/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Procurements', id }],
        }),

        // Create a procurement
        createProcurement: builder.mutation<ApiResponse<ProcurementDetail>, ProcurementFormValues>({
            query: (body) => ({ url: 'procurements', method: 'POST', body }),
            invalidatesTags: ['Procurements', 'BudgetLines', 'Dashboard'],
        }),

        // Update a procurement
        updateProcurement: builder.mutation<ApiResponse<ProcurementDetail>, { procurement_id: number } & Partial<ProcurementFormValues>>({
            query: ({ procurement_id, ...body }) => ({ url: `procurements/${procurement_id}`, method: 'PUT', body }),
            invalidatesTags: ['Procurements', 'BudgetLines', 'Dashboard'],
        }),

        // Delete a procurement
        deleteProcurement: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `procurements/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Procurements', 'BudgetLines', 'Dashboard'],
        }),

        // Record a workflow step update
        recordStageEvent: builder.mutation<ApiResponse<ProcurementDetail>, { procurement_id: number } & StageEventFormValues>({
            query: ({ procurement_id, ...body }) => ({ url: `procurements/${procurement_id}/stages`, method: 'POST', body }),
            invalidatesTags: ['Procurements', 'Dashboard'],
        }),

        // Undo a step recorded by mistake
        deleteStageEvent: builder.mutation<ApiResponse<ProcurementDetail>, { procurement_id: number; event_id: number }>({
            query: ({ procurement_id, event_id }) => ({ url: `procurements/${procurement_id}/stages/${event_id}`, method: 'DELETE' }),
            invalidatesTags: ['Procurements', 'Dashboard'],
        }),
    }),
})
