import React from 'react'
import { useRouteError } from 'react-router'

/**
 * Shown when a page fails to load or crashes. The usual cause on a live system
 * is a new version having been released while the app was open, which a reload
 * fixes, so that is what it offers.
 */
const RouteError: React.FC = () => {
    const error = useRouteError()
    console.error(error)

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-sm">
                <h1 className="text-lg font-bold text-gray-900">This page could not be opened</h1>
                <p className="mt-2 text-sm text-gray-600">Reloading usually fixes this. If it keeps happening, tell the system administrator.</p>
                <button type="button" className="btn btn-sm mt-4 border-0 bg-green-800 text-white hover:bg-green-900" onClick={() => window.location.reload()}>Reload</button>
            </div>
        </div>
    )
}

export default RouteError
