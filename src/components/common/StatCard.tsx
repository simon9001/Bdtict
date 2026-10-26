import React from 'react'

interface StatCardProps {
    label: string
    value: string
    hint?: string                 // small line under the value
    icon: React.ReactNode
    accent?: 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'gray'
    onClick?: () => void          // makes the tile a link to the items behind it
}

// Border / icon colours per accent (Tailwind needs full class names)
const ACCENTS = {
    green: { border: 'border-green-600', bg: 'bg-green-100', text: 'text-green-700' },
    blue: { border: 'border-blue-600', bg: 'bg-blue-100', text: 'text-blue-700' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-600' },
    purple: { border: 'border-purple-600', bg: 'bg-purple-100', text: 'text-purple-700' },
    red: { border: 'border-red-600', bg: 'bg-red-100', text: 'text-red-700' },
    gray: { border: 'border-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' },
}

// KPI tile - a single headline number
const StatCard: React.FC<StatCardProps> = ({ label, value, hint, icon, accent = 'green', onClick }) => {
    const colors = ACCENTS[accent]
    const Wrapper = onClick ? 'button' : 'div'

    return (
        <Wrapper
            onClick={onClick}
            className={`w-full rounded-lg border-l-4 bg-white p-5 text-left shadow-sm ${colors.border} ${onClick ? 'cursor-pointer transition hover:shadow-md' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600">{label}</p>
                    <p className="mt-1 truncate text-2xl font-bold text-gray-900">{value}</p>
                    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
                </div>
                <div className={`shrink-0 rounded-full p-3 ${colors.bg} ${colors.text}`}>{icon}</div>
            </div>
        </Wrapper>
    )
}

export default StatCard
