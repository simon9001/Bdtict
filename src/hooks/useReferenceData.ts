import { useMemo } from 'react'
import { settingsApi } from '../features/api/SettingsApi'
import { userApi } from '../features/api/UserApi'
import type { Lookup } from '../types/Types'

/**
 * Dropdown data used by forms and filters, loaded once and cached by RTK Query:
 * lookups grouped by type, financial years, workflow steps and the staff list.
 */
export const useReferenceData = () => {
    const { data: lookupsRes, isLoading: lookupsLoading } = settingsApi.useGetLookupsQuery()
    const { data: yearsRes, isLoading: yearsLoading } = settingsApi.useGetFinancialYearsQuery()
    const { data: stagesRes, isLoading: stagesLoading } = settingsApi.useGetWorkflowStagesQuery()
    const { data: usersRes, isLoading: usersLoading } = userApi.useGetUserDirectoryQuery()

    // Split the flat lookup list into one list per type
    const lookups = useMemo(() => {
        const byType = (type: Lookup['lookup_type']) => (lookupsRes?.data ?? []).filter((l) => l.lookup_type === type)
        return {
            categories: byType('category'),
            priorities: byType('priority'),
            acquisitionMethods: byType('acquisition_method'),
            scmOfficers: byType('scm_officer'),
            sections: byType('section'),
        }
    }, [lookupsRes])

    const financialYears = yearsRes?.data ?? []

    return {
        ...lookups,
        financialYears,
        currentYear: financialYears.find((fy) => fy.is_current),
        stages: stagesRes?.data ?? [],
        // Officers and the Head can own items; viewers and the system administrator cannot
        staff: (usersRes?.data ?? []).filter((u) => u.role === 'admin' || u.role === 'officer'),
        isLoading: lookupsLoading || yearsLoading || stagesLoading || usersLoading,
    }
}
