/**
 * The workbook's column headers for the workflow steps, shared by the sheet
 * tables and the card that adds or edits a row.
 */

// Steps not listed here (contract, delivery and any added in Settings) are shown
// after the sheet's own columns, under their own names.
export const STEP_HEADERS: Record<string, string> = {
    EGP_PR_RAISED: 'Raise PR on eGP',
    EGP_HOD: 'eGP Approval Status by HOD',
    EGP_DCS: 'eGP Approval Status by DCS',
    EGP_SCM: 'eGP Approval Status by SCM',
    EGP_DG: 'eGP Approval Status by DG',
    EGP_BOARD: 'eGP Approval Status by Board',
    TOR_PREPARATION: 'ToR preparation by ICT',
    TOR_APPROVAL: 'ToR Approval by ICT',
    TOR_TO_SCM: 'ToR submitted to SCM',
    SCM_STARTED: 'Acquisition process started by SCM',
    TENDER_FLOATED: 'Quotation/Tender Float Date',
    TENDER_OPENED: 'Tender/Quotation Opening Date',
    EVALUATION: 'Evaluation started',
    ERP_PR_RAISED: 'Raise PR on ERP',
    ERP_HOD: 'ERP Approval Status by HOD',
    ERP_FINANCE: 'ERP Approval Status by Finance',
    ERP_DG: 'ERP Approval Status by DG',
    ERP_SCM: 'ERP Approval Status by SCM',
}

// Memo steps have their own columns on the All list; the budget sheets have none
export const MEMO_STAGES = ['MEMO_TO_DG', 'DG_APPROVAL']

// Steps whose date is a field of the procurement, so they are entered as dates
export const TENDER_STAGES = ['TENDER_FLOATED', 'TENDER_OPENED']

// The All list's own headers for the memo steps
export const MEMO_STAGE_HEADERS: Record<string, string> = {
    MEMO_TO_DG: 'Delivery Day to DG',
    DG_APPROVAL: 'Day Approved by DG',
}
