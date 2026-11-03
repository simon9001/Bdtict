import React from 'react'

// Says which filters came from a chart click, for those with no dropdown on the page
const ActiveFilters: React.FC<{ items: (string | number | false | undefined | null)[] }> = ({ items }) => {
    const shown = items.filter(Boolean) as string[]
    if (shown.length === 0) return null
    return (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>Showing:</span>
            {shown.map((item) => <span key={item} className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-900">{item}</span>)}
        </div>
    )
}

export default ActiveFilters
