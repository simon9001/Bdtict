import { baseApi, toQueryString } from './baseApi'
import type { ApiResponse, Memo, MemoFormValues, MemoQuery, PaginatedResponse } from '../../types/Types'

// Memos to the DG
export const memoApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getMemos: builder.query<PaginatedResponse<Memo>, MemoQuery>({
            query: (params) => `memos${toQueryString(params)}`,
            providesTags: ['Memos'],
        }),

        createMemo: builder.mutation<ApiResponse<Memo>, MemoFormValues>({
            query: (body) => ({ url: 'memos', method: 'POST', body }),
            invalidatesTags: ['Memos', 'Dashboard'],
        }),

        updateMemo: builder.mutation<ApiResponse<Memo>, { memo_id: number } & Partial<MemoFormValues>>({
            query: ({ memo_id, ...body }) => ({ url: `memos/${memo_id}`, method: 'PUT', body }),
            invalidatesTags: ['Memos', 'Dashboard'],
        }),

        deleteMemo: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `memos/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Memos', 'Dashboard'],
        }),
    }),
})
