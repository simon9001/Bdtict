import React, { useState } from 'react'
import { useSelectedFy } from '../store/hooks'
import type { DashboardFilters } from '../types/Types'
import PageHeader from '../components/common/PageHeader'
import DashboardFilterBar, { type DashboardExtraFilters } from '../components/common/DashboardFilterBar'
import StageDurationChart from '../components/charts/StageDurationChart'
import OfficerWorkloadChart from '../components/charts/OfficerWorkloadChart'
import YearComparisonChart from '../components/charts/YearComparisonChart'

/**
 * Deeper analysis for the Head of ICT: where time is lost, how work is
 * spread across officers, and how this year compares with others.
 * Every chart has a table view for printing or copying into a report.
 */
const Reports: React.FC = () => {
    const fyId = useSelectedFy()
    const [extra, setExtra] = useState<DashboardExtraFilters>({})
    const filters: DashboardFilters = { fy_id: fyId, category_id: extra.categoryId, owner_id: extra.ownerId, quarter: extra.quarter }

    return (
        <>
            <PageHeader title="Reports" subtitle="Bottlenecks, workload and year-on-year performance" />
            <DashboardFilterBar {...extra} onChange={setExtra} />

            <div className="grid grid-cols-1 gap-6">
                <StageDurationChart filters={filters} />
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <OfficerWorkloadChart filters={filters} />
                    <YearComparisonChart filters={{ category_id: extra.categoryId, owner_id: extra.ownerId }} />
                </div>
            </div>
        </>
    )
}

export default Reports
