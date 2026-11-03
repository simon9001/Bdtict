import { createSlice } from '@reduxjs/toolkit'

/**
 * UI slice - layout preferences that survive a page refresh.
 * sidebarCollapsed: on large screens, show the sidebar as icons only.
 */

interface UiState {
    sidebarCollapsed: boolean
}

const initialState: UiState = {
    sidebarCollapsed: false,
}

export const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed
        },
    },
})

export const { toggleSidebar } = uiSlice.actions
export default uiSlice.reducer
