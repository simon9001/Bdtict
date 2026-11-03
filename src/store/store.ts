import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import { baseApi } from '../features/api/baseApi'
import authSlice from '../features/slice/AuthSlice'
import filterSlice from '../features/slice/FilterSlice'
import uiSlice from '../features/slice/UiSlice'

/**
 * Redux store.
 *   api          - RTK Query cache for every endpoint (features/api/*)
 *   authSlice    - logged-in user + token   (persisted)
 *   filterSlice  - selected financial year  (persisted)
 *   uiSlice      - sidebar full / icons only (persisted)
 */

// localStorage adapter for redux-persist. Written out instead of importing
// 'redux-persist/lib/storage', whose CommonJS default export resolves to the
// module wrapper (not the storage object) under Vite 8 and breaks start-up.
const storage = {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
}

const persistedAuthReducer = persistReducer(
    { key: 'auth', storage, version: 1, whitelist: ['token', 'isAuthenticated', 'user', 'expiresAt'] },
    authSlice,
)

const persistedFilterReducer = persistReducer({ key: 'filters', storage, version: 1 }, filterSlice)

const persistedUiReducer = persistReducer({ key: 'ui', storage, version: 1 }, uiSlice)

const rootReducer = combineReducers({
    [baseApi.reducerPath]: baseApi.reducer,
    authSlice: persistedAuthReducer,
    filterSlice: persistedFilterReducer,
    uiSlice: persistedUiReducer,
})

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }).concat(baseApi.middleware),
})

export const persistor = persistStore(store)

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
