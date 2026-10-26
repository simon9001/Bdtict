import React from 'react'
import { Navigate } from 'react-router'
import { useCurrentUser } from '../../store/hooks'

interface AdminRouteProps {
    children: React.ReactNode
}

// Head of ICT only (users, settings, audit). Others go back to the dashboard.
// Used inside ProtectedRoute, so the user is already logged in here.
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const user = useCurrentUser()

    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

export default AdminRoute
