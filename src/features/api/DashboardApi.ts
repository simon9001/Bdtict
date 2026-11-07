import { baseApi, toQueryString } from './baseApi'
import type {
    ActivitySummary, AgeingBucket, ApiResponse, AttentionItem, BalanceChecks, CategoryBudget, DashboardBreakdowns, DashboardFilters, DashboardResponse,
    DashboardSummary, ExpiringContract, MonthlyTrend, OfficerWorkload, PipelineStage, QuarterSpend, RecentActivity, StageDuration,
    TopBudgetLine, YearComparison,
} from '../../types/Types'

// One endpoint per dashboard chart. All accept fy_id / category_id / owner_id.
export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getSummary: builder.query<DashboardResponse<DashboardSummary>, DashboardFilters>({
            query: (filters) => `dashboard/summary${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getBudgetByCategory: builder.query<DashboardResponse<CategoryBudget[]>, DashboardFilters>({
            query: (filters) => `dashboard/budget-by-category${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getQuarterlySpend: builder.query<DashboardResponse<QuarterSpend[]>, DashboardFilters>({
            query: (filters) => `dashboard/quarterly-spend${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getPipeline: builder.query<DashboardResponse<PipelineStage[]>, DashboardFilters>({
            query: (filters) => `dashboard/pipeline${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getStageDurations: builder.query<DashboardResponse<StageDuration[]>, DashboardFilters>({
            query: (filters) => `dashboard/stage-durations${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getOfficerWorkload: builder.query<DashboardResponse<OfficerWorkload[]>, DashboardFilters>({
            query: (filters) => `dashboard/officer-workload${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getInvoiceAgeing: builder.query<DashboardResponse<AgeingBucket[]>, DashboardFilters>({
            query: (filters) => `dashboard/invoice-ageing${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getExpiringContracts: builder.query<DashboardResponse<ExpiringContract[]>, DashboardFilters & { days?: number }>({
            query: (filters) => `dashboard/expiring-contracts${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getAttentionList: builder.query<DashboardResponse<AttentionItem[]>, DashboardFilters>({
            query: (filters) => `dashboard/attention${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getBreakdowns: builder.query<DashboardResponse<DashboardBreakdowns>, DashboardFilters>({
            query: (filters) => `dashboard/breakdowns${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getBalanceChecks: builder.query<DashboardResponse<BalanceChecks>, DashboardFilters>({
            query: (filters) => `dashboard/balance-checks${toQueryString(filters)}`,
            providesTags: ['Dashboard', 'BudgetLines', 'Contracts', 'Payments'],
        }),

        getActivitySummary: builder.query<DashboardResponse<ActivitySummary>, DashboardFilters>({
            query: (filters) => `dashboard/activity-summary${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getMonthlyTrend: builder.query<DashboardResponse<MonthlyTrend[]>, DashboardFilters>({
            query: (filters) => `dashboard/monthly-trend${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getTopBudgetLines: builder.query<DashboardResponse<TopBudgetLine[]>, DashboardFilters>({
            query: (filters) => `dashboard/top-budget-lines${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getRecentActivity: builder.query<DashboardResponse<RecentActivity>, DashboardFilters>({
            query: (filters) => `dashboard/recent-activity${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),

        getYearComparison: builder.query<ApiResponse<YearComparison[]>, Omit<DashboardFilters, 'fy_id'>>({
            query: (filters) => `dashboard/year-comparison${toQueryString(filters)}`,
            providesTags: ['Dashboard'],
        }),
    }),
})
