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
import MyWork from './pages/MyWork'
import Procurements from './pages/procurements/Procurements'
import ProcurementDetail from './pages/procurements/ProcurementDetail'
import BudgetLines from './pages/budget/BudgetLines'
import BudgetLineDetail from './pages/budget/BudgetLineDetail'
import Contracts from './pages/contracts/Contracts'
import ContractDetail from './pages/contracts/ContractDetail'
import Invoices from './pages/invoices/Invoices'
import InvoiceDetail from './pages/invoices/InvoiceDetail'
import Payments from './pages/Payments'
import Tasks from './pages/Tasks'
import Profile from './pages/Profile'
import Users from './pages/admin/Users'
import Settings from './pages/admin/Settings'
import AuditLogs from './pages/admin/AuditLogs'
import NotFound from './pages/NotFound'

// Chart-heavy pages are loaded on demand so the charting library is not in the first download
const lazyPage = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

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
            { path: '/my-work', element: <MyWork /> },
            { path: '/procurements', element: <Procurements /> },
            { path: '/procurements/:id', element: <ProcurementDetail /> },
            { path: '/budget-lines', element: <BudgetLines /> },
            { path: '/budget-lines/:id', element: <BudgetLineDetail /> },
            { path: '/contracts', element: <Contracts /> },
            { path: '/contracts/:id', element: <ContractDetail /> },
            { path: '/invoices', element: <Invoices /> },
            { path: '/invoices/:id', element: <InvoiceDetail /> },
            { path: '/payments', element: <Payments /> },
            { path: '/tasks', element: <Tasks /> },
            { path: '/reports', lazy: lazyPage(() => import('./pages/Reports')) },
            { path: '/profile', element: <Profile /> },

            // Head of ICT only
            { path: '/admin/users', element: <AdminRoute><Users /></AdminRoute> },
            { path: '/admin/settings', element: <AdminRoute><Settings /></AdminRoute> },
            { path: '/admin/audit', element: <AdminRoute><AuditLogs /></AdminRoute> },

            { path: '*', element: <NotFound /> },
        ],
    },
])

function App() {
    return <RouterProvider router={router} />
}

export default App
