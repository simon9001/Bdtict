import { useSearchParams } from 'react-router'

type FilterValue = string | number | boolean | undefined | null

/**
 * List filters stored in the URL (?status=In%20Progress&page=2).
 * Dashboard tiles link straight to a filtered list, the browser back button
 * works, and a filtered view can be bookmarked or shared.
 */
export const useUrlFilters = () => {
    const [params, setParams] = useSearchParams()

    const getString = (key: string) => params.get(key) || undefined
    const getNumber = (key: string) => {
        const value = params.get(key)
        return value ? Number(value) : undefined
    }
    const getBool = (key: string) => (params.get(key) === 'true' ? true : undefined)

    /** Update some filters; any change other than the page resets to page 1. */
    const setFilters = (updates: Record<string, FilterValue>) => {
        const next = new URLSearchParams(params)
        for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === null || value === '' || value === false) next.delete(key)
            else next.set(key, String(value))
        }
        if (!('page' in updates)) next.delete('page')
        setParams(next, { replace: true })
    }

    const clearFilters = () => setParams(new URLSearchParams(), { replace: true })

    return {
        getString,
        getNumber,
        getBool,
        setFilters,
        clearFilters,
        page: getNumber('page') ?? 1,
        hasFilters: params.toString().length > 0,
    }
}
