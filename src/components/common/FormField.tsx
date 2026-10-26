import React from 'react'

/**
 * Form building blocks shared by every modal form (used with react-hook-form).
 *
 * @example
 *   <FormField label="Title" error={errors.title?.message} required>
 *       <input className={inputClass} {...register('title', { required: 'Title is required' })} />
 *   </FormField>
 */

// Same input look as the reference project (green focus ring)
export const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100'

interface FormFieldProps {
    label: string
    error?: string
    required?: boolean
    hint?: string
    children: React.ReactNode
    className?: string
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, required, hint, children, className = '' }) => (
    <div className={className}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
        {children}
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
)

/** Cancel + submit buttons at the bottom of a modal form */
export const FormActions: React.FC<{ onCancel: () => void; isSaving: boolean; submitLabel?: string }> = ({
    onCancel, isSaving, submitLabel = 'Save',
}) => (
    <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSaving}>
            Cancel
        </button>
        <button type="submit" className="btn border-none bg-green-800 text-white hover:bg-green-900" disabled={isSaving}>
            {isSaving ? <span className="loading loading-spinner loading-sm" /> : submitLabel}
        </button>
    </div>
)
