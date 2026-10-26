import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearCredentials } from '../../features/slice/AuthSlice'

interface ProtectedRouteProps {
    children: React.ReactNode
}

// Any logged-in staff member. Sends everyone else to /login.
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, user, expiresAt } = useAppSelector((state) => state.authSlice)
    const dispatch = useAppDispatch()
    const location = useLocation()

    const expired = !!expiresAt && Date.now() >= expiresAt

    // Drop a session whose token has expired (e.g. after the PC slept overnight)
    useEffect(() => {
        if (expired) dispatch(clearCredentials())
    }, [expired, dispatch])

    if (!isAuthenticated || !user || expired) {
        // Remember where the user was going so login can send them back
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    return <>{children}</>
}

export default ProtectedRoute
