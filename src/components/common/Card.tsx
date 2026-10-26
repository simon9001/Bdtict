import React from 'react'

interface CardProps {
    title?: string
    actions?: React.ReactNode
    children: React.ReactNode
    className?: string
    padded?: boolean // false for tables that run edge to edge
}

// White panel used for every section on a page
const Card: React.FC<CardProps> = ({ title, actions, children, className = '', padded = true }) => (
    <section className={`rounded-lg bg-white shadow-sm ${className}`}>
        {(title || actions) && (
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
                {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
                {actions}
            </div>
        )}
        <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
)

export default Card
