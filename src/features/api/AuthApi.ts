import { baseApi } from './baseApi'
import type { ApiResponse, AuthUser, ChangePasswordValues, LoginFormValues, LoginResponse } from '../../types/Types'

// Login, current user and password change
export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Log in with email + password
        login: builder.mutation<ApiResponse<LoginResponse>, LoginFormValues>({
            query: (credentials) => ({ url: 'auth/login', method: 'POST', body: credentials }),
        }),

        // Profile of the logged-in user
        getMe: builder.query<ApiResponse<AuthUser>, void>({
            query: () => 'auth/me',
        }),

        // Change own password
        changePassword: builder.mutation<ApiResponse<null>, ChangePasswordValues>({
            query: (body) => ({ url: 'auth/change-password', method: 'PUT', body }),
        }),
    }),
})
