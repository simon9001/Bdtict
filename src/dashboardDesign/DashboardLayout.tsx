import React, { useState } from 'react'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

/**
 * Shell around every logged-in page: fixed top bar, sidebar, and the page
 * itself rendered through <Outlet /> (pages are nested routes in App.tsx).
 */
const DashboardLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false) // mobile only

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" richColors closeButton />
            <Navbar onMenuClick={() => setSidebarOpen((open) => !open)} />
            <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

            {/* Dim the page behind the mobile drawer */}
            {sidebarOpen && (
                <div className="fixed inset-0 top-16 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <main className="pt-16 lg:ml-64">
                <div className="mx-auto max-w-7xl p-4 sm:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

export default DashboardLayout
