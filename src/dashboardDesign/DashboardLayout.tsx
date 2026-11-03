import React, { useState } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { toggleSidebar } from '../features/slice/UiSlice'
import { useIsLargeScreen } from '../hooks/useMediaQuery'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

/**
 * Shell around every logged-in page: fixed top bar, sidebar, and the page
 * itself rendered through <Outlet /> (pages are nested routes in App.tsx).
 *
 * The sidebar has two behaviours:
 *   large screens - always visible, full width or icons only (remembered)
 *   small screens - hidden, slides in as a drawer over the page
 */
const DashboardLayout: React.FC = () => {
    const dispatch = useAppDispatch()
    const isLargeScreen = useIsLargeScreen()
    const collapsed = useAppSelector((state) => state.uiSlice.sidebarCollapsed)
    const [drawerOpen, setDrawerOpen] = useState(false) // small screens only

    const handleMenuClick = () => {
        if (isLargeScreen) dispatch(toggleSidebar())
        else setDrawerOpen((open) => !open)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" richColors closeButton />
            <Navbar onMenuClick={handleMenuClick} sidebarVisible={isLargeScreen ? !collapsed : drawerOpen} />
            <Sidebar drawerOpen={drawerOpen} collapsed={collapsed} onNavigate={() => setDrawerOpen(false)} />

            {/* Dim the page behind the drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 top-16 z-30 bg-black/30 lg:hidden" onClick={() => setDrawerOpen(false)} />
            )}

            {/* The left margin follows the sidebar width */}
            <main className={`pt-16 transition-[margin] duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
                {/* Capped so lines stay readable on very wide monitors */}
                <div className="mx-auto max-w-[120rem] p-4 sm:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default DashboardLayout
