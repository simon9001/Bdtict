import React from 'react'
import { Navigate } from 'react-router'
import { useAppSelector } from '../../store/hooks'

interface PublicRouteProps {
    children: React.ReactNode
}

// Pages for logged-out visitors (login). Logged-in users go to the dashboard.
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
    const { isAuthenticated, user, expiresAt } = useAppSelector((state) => state.authSlice)
    const sessionValid = isAuthenticated && !!user && (!expiresAt || Date.now() < expiresAt)

    if (sessionValid) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

export default PublicRoute
