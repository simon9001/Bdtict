import { baseApi, toQueryString } from './baseApi'
import type {
    ApiResponse, Invoice, InvoiceDetail, InvoiceFormValues, InvoiceQuery, PaginatedResponse,
    PaymentFormValues, PaymentListResponse, PaymentQuery,
} from '../../types/Types'

// Invoices and the payments made against them
export const invoiceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // ------------------------------ Invoices -----------------------------
        getInvoices: builder.query<PaginatedResponse<Invoice>, InvoiceQuery>({
            query: (params) => `invoices${toQueryString(params)}`,
            providesTags: ['Invoices'],
        }),

        getInvoiceById: builder.query<ApiResponse<InvoiceDetail>, number>({
            query: (id) => `invoices/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Invoices', id }],
        }),

        createInvoice: builder.mutation<ApiResponse<InvoiceDetail>, InvoiceFormValues>({
            query: (body) => ({ url: 'invoices', method: 'POST', body }),
            invalidatesTags: ['Invoices', 'Contracts', 'Dashboard'],
        }),

        // e.g. move Received -> Verified -> Approved
        updateInvoice: builder.mutation<ApiResponse<InvoiceDetail>, { invoice_id: number } & Partial<InvoiceFormValues>>({
            query: ({ invoice_id, contract_id: _c, ...body }) => ({ url: `invoices/${invoice_id}`, method: 'PUT', body }),
            invalidatesTags: ['Invoices', 'Contracts', 'Dashboard'],
        }),

        deleteInvoice: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `invoices/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Invoices', 'Contracts', 'Dashboard'],
        }),

        // ------------------------------ Payments -----------------------------
        getPayments: builder.query<PaymentListResponse, PaymentQuery>({
            query: (params) => `payments${toQueryString(params)}`,
            providesTags: ['Payments'],
        }),

        // Payments change invoice status (-> Paid) and contract/dashboard totals
        createPayment: builder.mutation<ApiResponse<{ payment_id: number }>, PaymentFormValues>({
            query: (body) => ({ url: 'payments', method: 'POST', body }),
            invalidatesTags: ['Payments', 'Invoices', 'Contracts', 'Dashboard'],
        }),

        deletePayment: builder.mutation<ApiResponse<null>, number>({
            query: (id) => ({ url: `payments/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Payments', 'Invoices', 'Contracts', 'Dashboard'],
        }),
    }),
})
