/**
 * Shared TypeScript types.
 * They mirror the JSON returned by the BGTtracker API (see the backend README).
 * Dates arrive as ISO strings; money arrives as numbers (KES).
 */

// ============================== API envelopes ===============================

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/** Standard success response: { success, data } */
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

/** List response with pagination */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: Pagination;
}

/** Common page / limit query params */
export interface PageQuery {
    page?: number;
    limit?: number;
}

// ================================ Auth & users ==============================

export type UserRole = 'sa' | 'admin' | 'officer' | 'viewer';

/** The logged-in user stored in the auth slice */
export interface AuthUser {
    user_id: number;
    full_name: string;
    email: string;
    role: UserRole;
}

export interface LoginFormValues {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    expires_in: number; // seconds
    user: AuthUser;
}

export interface ChangePasswordValues {
    current_password: string;
    new_password: string;
}

export interface User extends AuthUser {
    phone_number: string | null;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Minimal user record for dropdowns */
export interface DirectoryUser {
    user_id: number;
    full_name: string;
    role: UserRole;
}

export interface UserFormValues {
    full_name: string;
    email: string;
    phone_number?: string | null;
    role: UserRole;
    password?: string;
    is_active?: boolean;
}

// ================================= Settings =================================

export type LookupType = 'category' | 'priority' | 'acquisition_method' | 'scm_officer' | 'section';

export interface Lookup {
    lookup_id: number;
    lookup_type: LookupType;
    value: string;
    sort_order: number;
    is_active: boolean;
}

export interface FinancialYear {
    fy_id: number;
    code: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
}

export type StageGroup = 'Memo' | 'eGP' | 'ToR' | 'Tender' | 'ERP' | 'Contract' | 'Delivery' | 'Closed';

export interface WorkflowStage {
    stage_id: number;
    code: string;
    name: string;
    stage_group: StageGroup;
    sort_order: number;
    sla_days: number;
    is_active: boolean;
}

// =============================== Budget lines ===============================

export interface Allocation {
    allocation_id?: number;
    fy_id: number;
    fy_code?: string;
    planned_amount: number;
    q1_amount: number;
    q2_amount: number;
    q3_amount: number;
    q4_amount: number;
}

export interface BudgetLine {
    budget_line_id: number;
    code: string | null;
    description: string;
    category_id: number;
    category: string;
    priority_id: number | null;
    priority: string | null;
    section_id: number | null;
    section: string | null;
    owner_id: number;
    owner_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    allocated_amount: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // present when the list is filtered by fy_id
    fy_planned_amount?: number | null;
    fy_q1_amount?: number | null;
    fy_q2_amount?: number | null;
    fy_q3_amount?: number | null;
    fy_q4_amount?: number | null;
}

export interface BudgetLineDetail extends BudgetLine {
    allocations: Allocation[];
    procurements: Pick<Procurement, 'procurement_id' | 'reference' | 'title' | 'fy_code' | 'status' | 'current_stage_name' | 'progress_percent' | 'is_overdue'>[];
}

export interface BudgetLineFormValues {
    code?: string | null;
    description: string;
    category_id: number;
    priority_id?: number | null;
    section_id?: number | null;
    owner_id?: number;
    quantity: number;
    unit_price: number;
    notes?: string | null;
}

export interface BudgetLineQuery extends PageQuery {
    fy_id?: number;
    category_id?: number;
    owner_id?: number;
    search?: string;
}

// =============================== Procurements ===============================

export const PROCUREMENT_STATUSES = ['Not Started', 'In Progress', 'In Review', 'On Hold', 'Completed', 'Cancelled', 'Rejected'] as const;
export type ProcurementStatus = (typeof PROCUREMENT_STATUSES)[number];

export const STAGE_EVENT_STATUSES = ['Pending', 'In Progress', 'In Review', 'Approved', 'Completed', 'Rejected', 'Returned'] as const;
export type StageEventStatus = (typeof STAGE_EVENT_STATUSES)[number];

export interface Procurement {
    procurement_id: number;
    reference: string | null;
    title: string;
    fy_id: number;
    fy_code: string;
    budget_line_id: number | null;
    budget_line_code: string | null;
    budget_line_description: string | null;
    owner_id: number;
    owner_name: string;
    category_id: number;
    category: string;
    priority_id: number | null;
    priority: string | null;
    priority_rank: number | null;
    acquisition_method_id: number | null;
    acquisition_method: string | null;
    scm_officer_id: number | null;
    scm_officer: string | null;
    section_id: number | null;
    section: string | null;
    status: ProcurementStatus;
    current_stage_id: number | null;
    current_stage_code: string | null;
    current_stage_name: string | null;
    current_stage_group: StageGroup | null;
    sla_days: number | null;
    stage_entered_at: string | null;
    days_in_stage: number | null;
    is_overdue: boolean;
    progress_percent: number;
    tender_float_date: string | null;
    tender_opening_date: string | null;
    tender_days: number | null;
    is_escalated: boolean;
    escalated_to: string | null;
    escalation_note: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface StageEvent {
    event_id: number;
    stage_id: number;
    stage_code: string;
    stage_name: string;
    stage_group: StageGroup;
    status: StageEventStatus;
    event_date: string;
    notes: string | null;
    recorded_by: number;
    recorded_by_name: string;
    created_at: string;
}

export interface ProcurementDetail extends Procurement {
    history: StageEvent[];
    contracts: Pick<Contract, 'contract_id' | 'contract_number' | 'supplier_name' | 'contract_value' | 'start_date' | 'end_date' | 'status'>[];
    open_tasks: Pick<Task, 'task_id' | 'title' | 'owner_id' | 'due_date' | 'status'>[];
}

export interface ProcurementFormValues {
    reference?: string | null;
    title: string;
    budget_line_id?: number | null;
    fy_id: number;
    owner_id?: number;
    category_id: number;
    priority_id?: number | null;
    acquisition_method_id?: number | null;
    scm_officer_id?: number | null;
    section_id?: number | null;
    status: ProcurementStatus;
    tender_float_date?: string | null;
    tender_opening_date?: string | null;
    is_escalated: boolean;
    escalated_to?: string | null;
    escalation_note?: string | null;
    notes?: string | null;
}

export interface StageEventFormValues {
    stage_id: number;
    status: StageEventStatus;
    event_date: string;
    notes?: string | null;
}

export interface ProcurementQuery extends PageQuery {
    fy_id?: number;
    status?: ProcurementStatus;
    category_id?: number;
    owner_id?: number;
    stage_id?: number;
    budget_line_id?: number;
    priority_id?: number;
    no_priority?: boolean;
    acquisition_method_id?: number;
    no_method?: boolean;
    stage_group?: string;
    no_stage?: boolean;
    passed_stage_id?: number;
    open_only?: boolean;
    statuses?: string;
    is_escalated?: boolean;
    overdue?: boolean;
    mine?: boolean;
    search?: string;
    sort?: 'newest' | 'priority' | 'days_in_stage' | 'title';
}

// ================================= Contracts ================================

export const CONTRACT_STATUSES = ['Active', 'Completed', 'Expired', 'Terminated'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export interface Contract {
    contract_id: number;
    procurement_id: number;
    procurement_title: string;
    fy_id: number;
    fy_code: string;
    owner_id: number;
    owner_name: string;
    contract_number: string;
    supplier_name: string;
    contract_value: number;
    start_date: string;
    end_date: string;
    status: ContractStatus;
    notes: string | null;
    invoiced_amount: number;
    paid_amount: number;
    balance: number;
    days_to_expiry: number;
    created_at: string;
    updated_at: string;
}

export interface ContractDetail extends Contract {
    invoices: Pick<Invoice, 'invoice_id' | 'invoice_number' | 'amount' | 'invoice_date' | 'received_date' | 'status' | 'paid_amount'>[];
}

export interface ContractFormValues {
    procurement_id: number;
    contract_number: string;
    supplier_name: string;
    contract_value: number;
    start_date: string;
    end_date: string;
    status: ContractStatus;
    notes?: string | null;
}

export interface ContractQuery extends PageQuery {
    procurement_id?: number;
    fy_id?: number;
    category_id?: number;
    owner_id?: number;
    status?: ContractStatus;
    expiring_within_days?: number;
    search?: string;
}

// ============================ Invoices & payments ===========================

export const INVOICE_STATUSES = ['Received', 'Verified', 'Approved', 'Paid', 'Rejected'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
/** Statuses a user can set by hand ("Paid" is automatic) */
export const MANUAL_INVOICE_STATUSES = ['Received', 'Verified', 'Approved', 'Rejected'] as const;

export interface Invoice {
    invoice_id: number;
    contract_id: number;
    contract_number: string;
    supplier_name: string;
    procurement_id: number;
    procurement_title: string;
    fy_id: number;
    fy_code: string;
    owner_id: number;
    owner_name: string;
    invoice_number: string;
    amount: number;
    invoice_date: string;
    received_date: string;
    status: InvoiceStatus;
    notes: string | null;
    paid_amount: number;
    balance: number;
    age_days: number | null;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    payment_id: number;
    invoice_id: number;
    invoice_number?: string;
    contract_id?: number;
    contract_number?: string;
    supplier_name?: string;
    procurement_id?: number;
    procurement_title?: string;
    amount: number;
    payment_date: string;
    reference: string | null;
    notes: string | null;
    created_by: number;
    created_by_name: string;
    created_at: string;
}

export interface InvoiceDetail extends Invoice {
    payments: Payment[];
}

export interface InvoiceFormValues {
    contract_id: number;
    invoice_number: string;
    amount: number;
    invoice_date: string;
    received_date: string;
    status: (typeof MANUAL_INVOICE_STATUSES)[number];
    notes?: string | null;
}

export interface InvoiceQuery extends PageQuery {
    contract_id?: number;
    procurement_id?: number;
    fy_id?: number;
    category_id?: number;
    age_min?: number;
    age_max?: number;
    received_from?: string;
    received_to?: string;
    owner_id?: number;
    status?: InvoiceStatus;
    unpaid_only?: boolean;
    search?: string;
}

export interface PaymentFormValues {
    invoice_id: number;
    amount: number;
    payment_date: string;
    reference?: string | null;
    notes?: string | null;
}

export interface PaymentQuery extends PageQuery {
    invoice_id?: number;
    contract_id?: number;
    fy_id?: number;
    category_id?: number;
    owner_id?: number;
    paid_from?: string;
    paid_to?: string;
}

export interface PaymentListResponse extends PaginatedResponse<Payment> {
    summary: { total_amount: number };
}

// =================================== Tasks ==================================

export const TASK_STATUSES = ['Open', 'In Progress', 'Done', 'Cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
    task_id: number;
    title: string;
    description: string | null;
    owner_id: number;
    owner_name: string;
    procurement_id: number | null;
    procurement_title: string | null;
    section_id: number | null;
    section: string | null;
    priority_id: number | null;
    priority: string | null;
    due_date: string | null;
    status: TaskStatus;
    is_overdue: boolean;
    created_at: string;
    updated_at: string;
}

export interface TaskFormValues {
    title: string;
    description?: string | null;
    owner_id?: number;
    procurement_id?: number | null;
    section_id?: number | null;
    priority_id?: number | null;
    due_date?: string | null;
    status: TaskStatus;
}

// =================================== Memos ==================================

export const DG_STATUSES = ['Pending', 'Approved', 'Rejected', 'Returned'] as const;
export type DgStatus = (typeof DG_STATUSES)[number];

export interface Memo {
    memo_id: number;
    reference: string | null;
    title: string;
    fy_id: number;
    fy_code: string;
    owner_id: number;
    owner_name: string;
    category_id: number;
    category: string;
    priority_id: number | null;
    priority: string | null;
    delivered_date: string | null;
    approved_date: string | null;
    dg_status: DgStatus | null;
    status: ProcurementStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface MemoFormValues {
    reference?: string | null;
    title: string;
    fy_id: number;
    owner_id?: number;
    category_id: number;
    priority_id?: number | null;
    delivered_date?: string | null;
    approved_date?: string | null;
    dg_status?: DgStatus | null;
    status: ProcurementStatus;
    notes?: string | null;
}

export interface MemoQuery extends PageQuery {
    fy_id?: number;
    status?: ProcurementStatus;
    category_id?: number;
    owner_id?: number;
}

// ================================== Tracker =================================

export interface TrackerStep {
    status: StageEventStatus;
    event_date: string;
}

export interface TrackerProcurement {
    procurement_id: number;
    reference: string | null;
    title: string;
    section_id: number | null;
    budget_line_id: number | null;
    owner_name: string;
    category: string;
    priority: string | null;
    status: ProcurementStatus;
    scm_officer: string | null;
    acquisition_method: string | null;
    tender_float_date: string | null;
    tender_opening_date: string | null;
    tender_days: number | null;
    is_escalated: boolean;
    escalated_to: string | null;
    progress_percent: number | null;
    notes: string | null;
    steps: Record<string, TrackerStep>;
}

export interface TrackerBudgetLine {
    budget_line_id: number;
    code: string | null;
    description: string;
    section_id: number | null;
    category: string;
    priority: string | null;
    quantity: number;
    unit_price: number;
    total_amount: number;
    owner_name: string;
    allocations: { fy_id: number; planned_amount: number; q1_amount: number; q2_amount: number; q3_amount: number; q4_amount: number }[];
}

export interface TrackerData {
    sections: { section_id: number; name: string; sort_order: number }[];
    stages: { stage_id: number; code: string; name: string; stage_group: string; sort_order: number }[];
    financial_years: { fy_id: number; code: string }[];
    budget_lines: TrackerBudgetLine[];
    procurements: TrackerProcurement[];
    memos: Pick<Memo, 'memo_id' | 'reference' | 'title' | 'owner_name' | 'category' | 'priority' | 'delivered_date' | 'approved_date' | 'dg_status' | 'status' | 'notes'>[];
    tasks: { task_id: number; title: string; section_id: number | null; owner_name: string; priority: string | null; due_date: string | null; status: TaskStatus }[];
}

export interface TaskQuery extends PageQuery {
    owner_id?: number;
    procurement_id?: number;
    status?: TaskStatus;
    open_only?: boolean;
    overdue?: boolean;
    mine?: boolean;
}

// ================================= Dashboard ================================

/** Filters shared by every dashboard endpoint */
export interface DashboardFilters {
    fy_id?: number;
    category_id?: number;
    owner_id?: number;
}

export interface DashboardResponse<T> extends ApiResponse<T> {
    financial_year: { fy_id: number; code: string };
}

export interface DashboardSummary {
    budget: number;
    contracted: number;
    invoiced: number;
    paid: number;
    outstanding: number;
    unpaid_invoices: number;
    budget_utilisation_percent: number;
    completion_rate_percent: number;
    procurements: {
        total: number;
        not_started: number;
        in_progress: number;
        on_hold: number;
        completed: number;
        cancelled_or_rejected: number;
        overdue: number;
        escalated: number;
    };
}

export interface NamedCount {
    id?: number | null; // lookup id, where the name is a lookup value
    name: string;
    value: number;
}

export interface DashboardBreakdowns {
    status: NamedCount[];
    priority: NamedCount[];
    method: NamedCount[];
    contract_status: NamedCount[];
    invoice_status: NamedCount[];
    task_status: NamedCount[];
}

export interface ActivitySummary {
    total: number;
    completed: number;
    by_status: NamedCount[];
    by_priority: NamedCount[];
    overdue: number;
    escalated: number;
    completion_rate_percent: number;
}

export interface MonthlyTrend {
    month: string;
    from_date: string;
    to_date: string;
    invoiced: number;
    paid: number;
}

export interface TopBudgetLine {
    budget_line_id: number;
    code: string | null;
    description: string;
    planned_amount: number;
}

export interface RecentActivity {
    steps: { event_id: number; procurement_id: number; title: string; stage_name: string; status: StageEventStatus; event_date: string; recorded_by_name: string }[];
    payments: { payment_id: number; amount: number; payment_date: string; reference: string | null; supplier_name: string; invoice_id: number; invoice_number: string }[];
}

export interface CategoryBudget {
    category_id: number;
    category: string;
    sort_order: number;
    budget: number;
    contracted: number;
    paid: number;
}

export interface QuarterSpend {
    quarter: string;
    from_date: string;
    to_date: string;
    planned: number;
    actual: number;
    cumulative_planned: number;
    cumulative_actual: number;
}

export interface PipelineStage {
    stage_id: number | null;
    stage_code: string;
    stage_name: string;
    stage_group: string;
    sort_order: number;
    items: number;
    overdue: number;
}

export interface StageDuration {
    stage_id: number;
    stage_code: string;
    stage_name: string;
    stage_group: string;
    sla_days: number;
    samples: number;
    avg_days: number | null;
    max_days: number | null;
    over_sla: boolean;
}

export interface OfficerWorkload {
    user_id: number;
    full_name: string;
    not_started: number;
    in_progress: number;
    on_hold: number;
    completed: number;
    overdue: number;
    escalated: number;
    open_tasks: number;
}

export interface AgeingBucket {
    bucket: string;
    invoices: number;
    amount: number;
}

export interface ExpiringContract {
    contract_id: number;
    contract_number: string;
    supplier_name: string;
    contract_value: number;
    start_date: string;
    end_date: string;
    days_to_expiry: number;
    procurement_id: number;
    procurement_title: string;
    owner_id: number;
    owner_name: string;
}

export type AttentionItem = Pick<Procurement,
    'procurement_id' | 'reference' | 'title' | 'owner_id' | 'owner_name' | 'category' | 'priority' | 'status' |
    'current_stage_name' | 'days_in_stage' | 'sla_days' | 'is_overdue' | 'is_escalated' | 'escalated_to' | 'escalation_note'>;

export interface YearComparison {
    fy_id: number;
    fy_code: string;
    is_current: boolean;
    budget: number;
    contracted: number;
    paid: number;
    procurements: number;
    completed: number;
}

// =================================== Audit ==================================

export interface AuditLog {
    audit_id: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    entity_id: number;
    old_values: string | null;
    new_values: string | null;
    request_id: string | null;
    ip_address: string | null;
    created_at: string;
    user_id: number | null;
    user_name: string | null;
}

export type AuthEventType = 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGED' | 'PASSWORD_RESET';

export interface AuthEvent {
    event_id: number;
    event_type: AuthEventType;
    reason: string | null;
    user_id: number | null;
    user_name: string | null;
    email: string | null;
    ip_address: string | null;
    user_agent: string | null;
    request_id: string | null;
    created_at: string;
}
