import React from 'react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    actions?: React.ReactNode // buttons shown on the right
}

// Title bar at the top of every page
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
)

export default PageHeader
