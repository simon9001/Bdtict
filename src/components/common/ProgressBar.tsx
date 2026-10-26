import React from 'react'

// Thin progress bar with the percentage written next to it
const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percent = Math.max(0, Math.min(100, Math.round(value)))
    return (
        <div className="flex items-center gap-2" title={`${percent}% of steps passed`}>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-green-700" style={{ width: `${percent}%` }} />
            </div>
            <span className="tabular w-9 text-right text-xs text-gray-600">{percent}%</span>
        </div>
    )
}

export default ProgressBar
