import React from 'react'

/**
 * Button styles used across pages (matching the reference project's green theme).
 */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }

/** Main action, e.g. "New procurement" */
export const PrimaryButton: React.FC<ButtonProps> = ({ icon, children, className = '', ...props }) => (
    <button className={`btn btn-sm border-none bg-green-800 text-white hover:bg-green-900 ${className}`} {...props}>
        {icon}
        {children}
    </button>
)

/** Secondary action, e.g. "Edit" */
export const SecondaryButton: React.FC<ButtonProps> = ({ icon, children, className = '', ...props }) => (
    <button className={`btn btn-sm btn-outline border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${className}`} {...props}>
        {icon}
        {children}
    </button>
)

/** Icon-only button in table rows */
export const IconButton: React.FC<ButtonProps & { label: string; tone?: 'default' | 'danger' }> = ({
    label, tone = 'default', children, className = '', ...props
}) => (
    <button
        className={`btn btn-ghost btn-xs ${tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-600'} ${className}`}
        aria-label={label}
        title={label}
        {...props}
    >
        {children}
    </button>
)
