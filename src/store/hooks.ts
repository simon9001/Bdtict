import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

/**
 * Typed Redux hooks plus small shortcuts used across pages.
 */

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

/** The logged-in user (null when logged out) */
export const useCurrentUser = () => useAppSelector((state) => state.authSlice.user)

/** Selected financial year id, or undefined for "current year" (the API default) */
export const useSelectedFy = () => useAppSelector((state) => state.filterSlice.fyId) ?? undefined
