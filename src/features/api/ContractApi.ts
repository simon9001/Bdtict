import { baseApi, toQueryString } from './baseApi'
import type { ApiResponse, Contract, ContractDetail, ContractFormValues, ContractQuery, PaginatedResponse } from '../../types/Types'

// Awarded contracts
export const contractApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Paginated list with filters (incl. expiring_within_days)
        getContracts: builder.query<PaginatedResponse<Contract>, ContractQuery>({
            query: (params) => `contracts${toQueryString(params)}`,
            providesTags: ['Contracts'],
        }),

        // One contract with its invoices
        getContractById: builder.query<ApiResponse<ContractDetail>, number>({
            query: (id) => `contracts/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Contracts', id }],
        }),

        // Create a contract
        createContract: builder.mutation<ApiResponse<ContractDetail>, ContractFormValues>({
            query: (body) => ({ url: 'contracts', method: 'POST', body }),
            invalidatesTags: ['Contracts', 'Procurements', 'Dashboard'],
        }),

        // Update a contract (e.g. extension of time = new end date)
        updateContract: builder.mutation<ApiResponse<ContractDetail>, { contract_id: number } & Partial<ContractFormValues>>({
            query: ({ contract_id, procurement_id: _p, ...body }) => ({ url: `contracts/${contract_id}`, method: 'PUT', body }),
            invalidatesTags: ['Contracts', 'Procurements', 'Dashboard'],
        }),

        // Delete a contract with no invoices
        deleteContract: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `contracts/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Contracts', 'Procurements', 'Dashboard'],
        }),
    }),
})
