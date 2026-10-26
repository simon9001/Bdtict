import React from 'react'
import { CircleX, Inbox } from 'lucide-react'
import { getErrorMessage } from '../../utils/errors'

// Loading / error / empty placeholders used inside cards and tables

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500">
        <span className="loading loading-spinner loading-lg text-green-700" />
        <span className="text-sm">{label}</span>
    </div>
)

export const ErrorState: React.FC<{ error?: unknown; onRetry?: () => void }> = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <CircleX className="text-red-500" size={40} aria-hidden />
        <p className="text-sm text-red-700">{getErrorMessage(error, 'Could not load this data.')}</p>
        {onRetry && (
            <button className="btn btn-sm btn-outline" onClick={onRetry}>
                Try again
            </button>
        )}
    </div>
)

export const EmptyState: React.FC<{ message: string; action?: React.ReactNode }> = ({ message, action }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-500">
        <Inbox size={40} className="text-gray-300" aria-hidden />
        <p className="text-sm">{message}</p>
        {action}
    </div>
)
