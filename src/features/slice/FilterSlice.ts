import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/**
 * Filter slice - the financial year selected in the top bar.
 * Every page (dashboard, procurements, budget lines ...) reads it, so switching
 * the year in one place updates the whole app. null = the current year.
 */

interface FilterState {
    fyId: number | null
}

const initialState: FilterState = {
    fyId: null,
}

export const filterSlice = createSlice({
    name: 'filters',
    initialState,
    reducers: {
        setFinancialYear: (state, action: PayloadAction<number | null>) => {
            state.fyId = action.payload
        },
    },
})

export const { setFinancialYear } = filterSlice.actions
export default filterSlice.reducer
