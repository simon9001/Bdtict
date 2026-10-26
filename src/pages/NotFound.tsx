import React from 'react'
import { Link } from 'react-router'

// Shown for any URL that does not match a page
const NotFound: React.FC = () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-6xl font-bold text-green-800">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-500">The page you are looking for does not exist or has moved.</p>
        <Link to="/dashboard" className="btn mt-6 border-none bg-green-800 text-white hover:bg-green-900">Back to dashboard</Link>
    </div>
)

export default NotFound
