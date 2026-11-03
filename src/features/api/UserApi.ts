import { baseApi } from './baseApi'
import type { ApiResponse, DirectoryUser, User, UserFormValues } from '../../types/Types'

// Staff accounts (management is for the system administrator; the directory is for everyone)
export const userApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Active staff for owner dropdowns and filters
        getUserDirectory: builder.query<ApiResponse<DirectoryUser[]>, void>({
            query: () => 'users/directory',
            providesTags: ['Users'],
        }),

        // All staff accounts (sa)
        getAllUsers: builder.query<ApiResponse<User[]>, void>({
            query: () => 'users',
            providesTags: ['Users'],
        }),

        // Create a staff account (sa)
        createUser: builder.mutation<ApiResponse<User>, UserFormValues>({
            query: (body) => ({ url: 'users', method: 'POST', body }),
            invalidatesTags: ['Users'],
        }),

        // Update name / email / role / active flag (sa)
        updateUser: builder.mutation<ApiResponse<User>, { user_id: number } & Partial<UserFormValues>>({
            query: ({ user_id, ...body }) => ({ url: `users/${user_id}`, method: 'PUT', body }),
            invalidatesTags: ['Users'],
        }),

        // Set a new password for a staff member (sa)
        resetPassword: builder.mutation<ApiResponse<null>, { user_id: number; new_password: string }>({
            query: ({ user_id, ...body }) => ({ url: `users/${user_id}/reset-password`, method: 'PUT', body }),
        }),
    }),
})
