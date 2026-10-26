import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pagination as PaginationInfo } from '../../types/Types'

interface PaginationProps {
    pagination?: PaginationInfo
    onPageChange: (page: number) => void
}

// "Showing 1-25 of 140" + previous / next buttons under a table
const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
    if (!pagination || pagination.total === 0) return null
    const { page, limit, total, totalPages } = pagination
    const from = (page - 1) * limit + 1
    const to = Math.min(page * limit, total)

    return (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <span className="tabular">
                Showing {from}–{to} of {total}
            </span>
            <div className="join">
                <button className="btn btn-sm join-item" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                    <ChevronLeft size={16} />
                </button>
                <span className="btn btn-sm join-item pointer-events-none tabular">
                    {page} / {totalPages}
                </span>
                <button className="btn btn-sm join-item" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    )
}

export default Pagination
