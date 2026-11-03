import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks a CSS media query from JavaScript, for the few layout decisions that
 * Tailwind classes cannot reach (e.g. the axis width of a chart).
 */
export const useMediaQuery = (query: string): boolean => {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const media = window.matchMedia(query)
            media.addEventListener('change', onChange)
            return () => media.removeEventListener('change', onChange)
        },
        [query],
    )
    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** Below Tailwind's "sm" breakpoint: phones */
export const useIsSmallScreen = () => useMediaQuery('(max-width: 639px)')

/** Tailwind's "lg" breakpoint and up: the sidebar is fixed beside the page */
export const useIsLargeScreen = () => useMediaQuery('(min-width: 1024px)')
