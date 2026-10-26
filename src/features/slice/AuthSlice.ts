import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser } from '../../types/Types'

/**
 * Auth slice - who is logged in.
 * Persisted to localStorage (see store.ts) so a page refresh keeps the session
 * until the token expires.
 */

interface AuthState {
    isAuthenticated: boolean
    token: string | null
    user: AuthUser | null
    expiresAt: number | null // epoch milliseconds
}

const initialState: AuthState = {
    isAuthenticated: false,
    token: null,
    user: null,
    expiresAt: null,
}

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Save the token and user after a successful login
        setCredentials: (state, action: PayloadAction<{ user: AuthUser; token: string; expiresIn: number }>) => {
            state.user = action.payload.user
            state.token = action.payload.token
            state.expiresAt = Date.now() + action.payload.expiresIn * 1000
            state.isAuthenticated = true
        },
        // Log out (also used when the API answers 401)
        clearCredentials: (state) => {
            state.user = null
            state.token = null
            state.expiresAt = null
            state.isAuthenticated = false
        },
    },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export default authSlice.reducer
