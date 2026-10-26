import { baseApi } from './baseApi'
import type { ApiResponse, FinancialYear, Lookup, LookupType, WorkflowStage } from '../../types/Types'

// Settings managed by the Head of ICT: lookups, financial years, workflow stages
export const settingsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // ------------------------------ Lookups ------------------------------
        getLookups: builder.query<ApiResponse<Lookup[]>, { include_inactive?: boolean } | void>({
            query: (params) => `lookups${params?.include_inactive ? '?include_inactive=true' : ''}`,
            providesTags: ['Lookups'],
        }),
        createLookup: builder.mutation<ApiResponse<Lookup>, { lookup_type: LookupType; value: string; sort_order: number }>({
            query: (body) => ({ url: 'lookups', method: 'POST', body }),
            invalidatesTags: ['Lookups'],
        }),
        updateLookup: builder.mutation<ApiResponse<Lookup>, { lookup_id: number; value?: string; sort_order?: number; is_active?: boolean }>({
            query: ({ lookup_id, ...body }) => ({ url: `lookups/${lookup_id}`, method: 'PUT', body }),
            invalidatesTags: ['Lookups'],
        }),

        // -------------------------- Financial years --------------------------
        getFinancialYears: builder.query<ApiResponse<FinancialYear[]>, void>({
            query: () => 'financial-years',
            providesTags: ['FinancialYears'],
        }),
        createFinancialYear: builder.mutation<ApiResponse<FinancialYear>, { code: string; start_date: string; end_date: string }>({
            query: (body) => ({ url: 'financial-years', method: 'POST', body }),
            invalidatesTags: ['FinancialYears'],
        }),
        setCurrentFinancialYear: builder.mutation<ApiResponse<FinancialYear>, number>({
            query: (fy_id) => ({ url: `financial-years/${fy_id}/set-current`, method: 'PUT' }),
            invalidatesTags: ['FinancialYears', 'Dashboard'],
        }),

        // -------------------------- Workflow stages --------------------------
        getWorkflowStages: builder.query<ApiResponse<WorkflowStage[]>, { include_inactive?: boolean } | void>({
            query: (params) => `workflow-stages${params?.include_inactive ? '?include_inactive=true' : ''}`,
            providesTags: ['WorkflowStages'],
        }),
        createWorkflowStage: builder.mutation<ApiResponse<WorkflowStage>, Omit<WorkflowStage, 'stage_id' | 'is_active'>>({
            query: (body) => ({ url: 'workflow-stages', method: 'POST', body }),
            invalidatesTags: ['WorkflowStages'],
        }),
        updateWorkflowStage: builder.mutation<ApiResponse<WorkflowStage>, { stage_id: number } & Partial<Omit<WorkflowStage, 'stage_id' | 'code'>>>({
            query: ({ stage_id, ...body }) => ({ url: `workflow-stages/${stage_id}`, method: 'PUT', body }),
            invalidatesTags: ['WorkflowStages', 'Procurements', 'Dashboard'],
        }),
    }),
})
