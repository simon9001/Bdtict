import React from 'react'
import { QUARTERS } from '../../utils/quarters'

// Quarter filter for the filter bars of the list pages
const QuarterSelect: React.FC<{ value?: number; onChange: (quarter: string) => void }> = ({ value, onChange }) => (
    <select className="select select-sm w-full border-gray-300 sm:w-36" value={value ?? ''} aria-label="Quarter" onChange={(e) => onChange(e.target.value)}>
        <option value="">All quarters</option>
        {QUARTERS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
    </select>
)

export default QuarterSelect
