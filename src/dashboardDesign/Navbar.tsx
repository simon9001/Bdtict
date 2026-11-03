import React from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarRange, KeyRound, Landmark, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAppDispatch, useAppSelector, useCurrentUser } from '../store/hooks'
import { clearCredentials } from '../features/slice/AuthSlice'
import { setFinancialYear } from '../features/slice/FilterSlice'
import { baseApi } from '../features/api/baseApi'
import { settingsApi } from '../features/api/SettingsApi'

const ROLE_LABELS = { sa: 'System Administrator', admin: 'Head of ICT', officer: 'ICT Officer', viewer: 'Viewer' }

interface NavbarProps {
    onMenuClick: () => void  // small screens: drawer · large screens: full / icons only
    sidebarVisible: boolean  // drives the button's icon and label
}

// Top bar: app name, financial-year switcher (applies to every page) and user menu
const Navbar: React.FC<NavbarProps> = ({ onMenuClick, sidebarVisible }) => {
    const user = useCurrentUser()
    const fyId = useAppSelector((state) => state.filterSlice.fyId)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { data: yearsRes } = settingsApi.useGetFinancialYearsQuery()
    const years = yearsRes?.data ?? []

    const handleLogout = () => {
        dispatch(clearCredentials())
        dispatch(baseApi.util.resetApiState()) // never show the previous user's cached data
        navigate('/login')
    }

    const initials = user?.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

    return (
        <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center gap-2 border-b border-gray-200 bg-white px-2 shadow-sm sm:gap-3 sm:px-4">
            <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={onMenuClick}
                aria-label={sidebarVisible ? 'Collapse menu' : 'Expand menu'}
                aria-expanded={sidebarVisible}
                title={sidebarVisible ? 'Collapse menu' : 'Expand menu'}
            >
                <Menu size={20} className="lg:hidden" aria-hidden />
                {sidebarVisible
                    ? <PanelLeftClose size={20} className="hidden lg:block" aria-hidden />
                    : <PanelLeftOpen size={20} className="hidden lg:block" aria-hidden />}
            </button>

            <Link to="/dashboard" className="flex items-center gap-2">
                <span className="rounded-lg bg-green-800 p-1.5 text-white">
                    <Landmark size={20} aria-hidden />
                </span>
                <span className="hidden text-lg font-bold text-green-800 sm:inline">ICT Budget Tracker</span>
            </Link>

            <div className="ml-auto flex items-center gap-1 sm:gap-3">
                {/* Financial year - global filter */}
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarRange size={18} className="hidden sm:block" aria-hidden />
                    <span className="sr-only">Financial year</span>
                    <select
                        className="select select-sm w-28 border-gray-300 sm:w-36"
                        value={fyId ?? ''}
                        onChange={(e) => dispatch(setFinancialYear(e.target.value ? Number(e.target.value) : null))}
                    >
                        <option value="">Current FY</option>
                        {years.map((fy) => (
                            <option key={fy.fy_id} value={fy.fy_id}>
                                FY {fy.code}{fy.is_current ? ' (current)' : ''}
                            </option>
                        ))}
                    </select>
                </label>

                {/* User menu */}
                <div className="dropdown dropdown-end">
                    <button tabIndex={0} className="btn btn-ghost btn-sm gap-2 px-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-800">
                            {initials}
                        </span>
                        <span className="hidden text-left leading-tight md:block">
                            <span className="block text-sm font-medium text-gray-900">{user?.full_name}</span>
                            <span className="block text-xs font-normal text-gray-500">{user ? ROLE_LABELS[user.role] : ''}</span>
                        </span>
                    </button>
                    <ul tabIndex={0} className="menu dropdown-content z-50 mt-2 w-52 rounded-box bg-white p-2 shadow-lg">
                        <li>
                            <Link to="/profile"><KeyRound size={16} /> Profile & password</Link>
                        </li>
                        <li>
                            <button onClick={handleLogout} className="text-red-700"><LogOut size={16} /> Log out</button>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    )
}

export default Navbar
