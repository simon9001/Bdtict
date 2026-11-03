import React from 'react'
import { Navigate } from 'react-router'
import { useCurrentUser } from '../../store/hooks'
import { isSa } from '../../utils/permissions'

interface SaRouteProps {
    children: React.ReactNode
}

// System administrator only (user accounts). Others go back to the dashboard.
// Used inside ProtectedRoute, so the user is already logged in here.
const SaRoute: React.FC<SaRouteProps> = ({ children }) => {
    const user = useCurrentUser()

    if (!isSa(user)) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

export default SaRoute
