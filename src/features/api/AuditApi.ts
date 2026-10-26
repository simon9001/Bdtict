import { baseApi, toQueryString } from './baseApi'
import type { AuditLog, AuthEvent, AuthEventType, PageQuery, PaginatedResponse } from '../../types/Types'

// Audit trail and login history (admin only)
export const auditApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getAuditLogs: builder.query<PaginatedResponse<AuditLog>, PageQuery & { entity?: string; user_id?: number }>({
            query: (params) => `audit-logs${toQueryString(params)}`,
            providesTags: ['AuditLogs'],
        }),

        getAuthEvents: builder.query<PaginatedResponse<AuthEvent>, PageQuery & { event_type?: AuthEventType; user_id?: number }>({
            query: (params) => `audit-logs/auth-events${toQueryString(params)}`,
            providesTags: ['AuditLogs'],
        }),
    }),
})
