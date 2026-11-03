import type React from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router'

// Layout
import DashboardLayout from './dashboardDesign/DashboardLayout'

// Route protection components
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import PublicRoute from './components/auth/PublicRoute'

// Pages
import Login from './pages/Login'
import SaRoute from './components/auth/SaRoute'

// Pages are loaded when first opened, so the first download stays small
type PageModule = () => Promise<{ default: React.ComponentType }>
const lazyPage = (load: PageModule) => async () => ({ Component: (await load()).default })

// The same for a page behind a role check
const guardedPage = (Guard: React.ComponentType<{ children: React.ReactNode }>, load: PageModule) => async () => {
    const Page = (await load()).default
    return { Component: () => <Guard><Page /></Guard> }
}

/**
 * Routes.
 * Every logged-in page is a child of one layout route, so the top bar and
 * sidebar are rendered once and pages swap inside <Outlet />.
 */
const router = createBrowserRouter([
    // Public
    { path: '/login', element: <PublicRoute><Login /></PublicRoute> },

    // Logged-in staff (any role)
    {
        element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
        children: [
            { path: '/', element: <Navigate to="/dashboard" replace /> },
            { path: '/dashboard', lazy: lazyPage(() => import('./pages/Dashboard')) },
            { path: '/my-work', lazy: lazyPage(() => import('./pages/MyWork')) },
            { path: '/tracker', lazy: lazyPage(() => import('./pages/Tracker')) },
            { path: '/tracker/:sheet', lazy: lazyPage(() => import('./pages/Tracker')) },
            { path: '/lists', lazy: lazyPage(() => import('./pages/Lists')) },
            { path: '/memos', lazy: lazyPage(() => import('./pages/Memos')) },
            { path: '/procurements', lazy: lazyPage(() => import('./pages/procurements/Procurements')) },
            { path: '/procurements/:id', lazy: lazyPage(() => import('./pages/procurements/ProcurementDetail')) },
            { path: '/budget-lines', lazy: lazyPage(() => import('./pages/budget/BudgetLines')) },
            { path: '/budget-lines/:id', lazy: lazyPage(() => import('./pages/budget/BudgetLineDetail')) },
            { path: '/contracts', lazy: lazyPage(() => import('./pages/contracts/Contracts')) },
            { path: '/contracts/:id', lazy: lazyPage(() => import('./pages/contracts/ContractDetail')) },
            { path: '/invoices', lazy: lazyPage(() => import('./pages/invoices/Invoices')) },
            { path: '/invoices/:id', lazy: lazyPage(() => import('./pages/invoices/InvoiceDetail')) },
            { path: '/payments', lazy: lazyPage(() => import('./pages/Payments')) },
            { path: '/tasks', lazy: lazyPage(() => import('./pages/Tasks')) },
            { path: '/reports', lazy: lazyPage(() => import('./pages/Reports')) },
            { path: '/profile', lazy: lazyPage(() => import('./pages/Profile')) },

            // System administrator only
            { path: '/admin/users', lazy: guardedPage(SaRoute, () => import('./pages/admin/Users')) },

            // Head of ICT and system administrator
            { path: '/admin/settings', lazy: guardedPage(AdminRoute, () => import('./pages/admin/Settings')) },
            { path: '/admin/audit', lazy: guardedPage(AdminRoute, () => import('./pages/admin/AuditLogs')) },

            { path: '*', lazy: lazyPage(() => import('./pages/NotFound')) },
        ],
    },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
