/**
 * react-hook-form value converters used with `setValueAs` on optional fields.
 */

/** Optional <select> of ids: "" -> null, "3" -> 3 */
export const optionalId = (value: string | number | null) => (value === '' || value === null ? null : Number(value))

/** Optional text / date inputs: "" -> null */
export const optionalText = (value: string | null) => (value === '' || value === null ? null : value)
