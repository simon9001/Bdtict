import type { AuthUser } from '../types/Types'

/**
 * Mirrors the backend access rules so the UI only shows buttons that will work.
 * (The API still enforces every rule - this is only for a cleaner screen.)
 *
 *   sa      - manage user accounts and settings; read only for department records
 *   admin   - edit anything
 *   officer - create records, edit only their own
 *   viewer  - read only
 */

/** May create new records at all */
export const canCreate = (user: AuthUser | null): boolean => user?.role === 'admin' || user?.role === 'officer'

/** May edit a record owned by ownerId */
export const canEditOwned = (user: AuthUser | null, ownerId: number | null | undefined): boolean =>
    !!user && (user.role === 'admin' || (user.role === 'officer' && user.user_id === ownerId))

/** System administrator: the only role that manages user accounts */
export const isSa = (user: AuthUser | null): boolean => user?.role === 'sa'

/** Head of ICT */
export const isAdmin = (user: AuthUser | null): boolean => user?.role === 'admin'
