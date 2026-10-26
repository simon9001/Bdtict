import { baseApi, toQueryString } from './baseApi'
import type { ApiResponse, PaginatedResponse, Task, TaskFormValues, TaskQuery } from '../../types/Types'

// Follow-up tasks
export const taskApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getTasks: builder.query<PaginatedResponse<Task>, TaskQuery>({
            query: (params) => `tasks${toQueryString(params)}`,
            providesTags: ['Tasks'],
        }),

        createTask: builder.mutation<ApiResponse<Task>, TaskFormValues>({
            query: (body) => ({ url: 'tasks', method: 'POST', body }),
            invalidatesTags: ['Tasks', 'Procurements', 'Dashboard'],
        }),

        updateTask: builder.mutation<ApiResponse<Task>, { task_id: number } & Partial<TaskFormValues>>({
            query: ({ task_id, ...body }) => ({ url: `tasks/${task_id}`, method: 'PUT', body }),
            invalidatesTags: ['Tasks', 'Procurements', 'Dashboard'],
        }),

        deleteTask: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `tasks/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Tasks', 'Procurements', 'Dashboard'],
        }),
    }),
})
