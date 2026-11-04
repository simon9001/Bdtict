import { baseApi, toQueryString } from './baseApi'
import type {
    Allocation, ApiResponse, BudgetLine, BudgetLineDetail, BudgetLineFormValues, BudgetLineQuery, PaginatedResponse,
} from '../../types/Types'

// Budget lines and their yearly allocations
export const budgetLineApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Paginated list with filters
        getBudgetLines: builder.query<PaginatedResponse<BudgetLine>, BudgetLineQuery>({
            query: (params) => `budget-lines${toQueryString(params)}`,
            providesTags: ['BudgetLines'],
        }),

        // One line with allocations + linked procurements
        getBudgetLineById: builder.query<ApiResponse<BudgetLineDetail>, number>({
            query: (id) => `budget-lines/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'BudgetLines', id }],
        }),

        // Create a budget line
        createBudgetLine: builder.mutation<ApiResponse<BudgetLineDetail>, BudgetLineFormValues>({
            query: (body) => ({ url: 'budget-lines', method: 'POST', body }),
            invalidatesTags: ['BudgetLines', 'Dashboard'],
        }),

        // Update a budget line
        updateBudgetLine: builder.mutation<ApiResponse<BudgetLineDetail>, { budget_line_id: number } & Partial<BudgetLineFormValues>>({
            query: ({ budget_line_id, ...body }) => ({ url: `budget-lines/${budget_line_id}`, method: 'PUT', body }),
            invalidatesTags: ['BudgetLines', 'Dashboard'],
        }),

        // Set the planned spend for one financial year
        setAllocation: builder.mutation<ApiResponse<BudgetLineDetail>, { budget_line_id: number } & Allocation>({
            query: ({ budget_line_id, fy_id, allocation_id: _id, fy_code: _code, ...body }) => ({
                url: `budget-lines/${budget_line_id}/allocations/${fy_id}`, method: 'PUT', body,
            }),
            invalidatesTags: ['BudgetLines', 'Dashboard'],
        }),

        // Change one figure of a year's plan; the server keeps the others
        patchAllocation: builder.mutation<ApiResponse<BudgetLineDetail>, { budget_line_id: number; fy_id: number; planned_amount?: number; q1_amount?: number; q2_amount?: number; q3_amount?: number; q4_amount?: number }>({
            query: ({ budget_line_id, fy_id, ...body }) => ({ url: `budget-lines/${budget_line_id}/allocations/${fy_id}`, method: 'PATCH', body }),
            invalidatesTags: ['BudgetLines', 'Dashboard'],
        }),

        // Remove the allocation of one financial year
        deleteAllocation: builder.mutation<ApiResponse<null>, { budget_line_id: number; fy_id: number }>({
            query: ({ budget_line_id, fy_id }) => ({ url: `budget-lines/${budget_line_id}/allocations/${fy_id}`, method: 'DELETE' }),
            invalidatesTags: ['BudgetLines', 'Dashboard'],
        }),

        // Delete a budget line
        deleteBudgetLine: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `budget-lines/${id}`, method: 'DELETE' }),
            invalidatesTags: ['BudgetLines', 'Dashboard'],
        }),
    }),
})
