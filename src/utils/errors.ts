/**
 * Turns an RTK Query error into a message for a toast.
 *
 * The API answers errors as { success: false, error, details? } where details
 * is a list of { field, message } for validation failures.
 */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
    const err = error as { status?: number | string; data?: { error?: string; details?: { field: string; message: string }[]; request_id?: string } }

    if (err?.status === 'FETCH_ERROR') return 'Cannot reach the server. Check that the API is running.'

    const data = err?.data
    if (!data?.error) return fallback

    // Validation errors: show the first field problem, it is the most useful
    if (Array.isArray(data.details) && data.details.length > 0) {
        const first = data.details[0]
        return `${data.error}: ${first.field ? `${first.field} - ` : ''}${first.message}`
    }

    // Unexpected server errors carry a request id staff can report
    return data.request_id ? `${data.error} (ref: ${data.request_id})` : data.error
}
