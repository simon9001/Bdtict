import React from 'react'
import { NavLink } from 'react-router'
import {
    BarChart3, Briefcase, ClipboardList, CreditCard, FileSignature, History, LayoutDashboard,
    ListTodo, Receipt, Settings, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { useCurrentUser } from '../store/hooks'

interface NavItem {
    name: string
    path: string
    icon: LucideIcon
}

interface NavGroup {
    title: string
    items: NavItem[]
    adminOnly?: boolean
}

// Sidebar menu, grouped by what staff do
const NAV_GROUPS: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'My Work', path: '/my-work', icon: Briefcase },
        ],
    },
    {
        title: 'Tracking',
        items: [
            { name: 'Procurements', path: '/procurements', icon: ClipboardList },
            { name: 'Budget Lines', path: '/budget-lines', icon: Wallet },
            { name: 'Tasks', path: '/tasks', icon: ListTodo },
        ],
    },
    {
        title: 'Money',
        items: [
            { name: 'Contracts', path: '/contracts', icon: FileSignature },
            { name: 'Invoices', path: '/invoices', icon: Receipt },
            { name: 'Payments', path: '/payments', icon: CreditCard },
        ],
    },
    {
        title: 'Analysis',
        items: [{ name: 'Reports', path: '/reports', icon: BarChart3 }],
    },
    {
        title: 'Administration',
        adminOnly: true,
        items: [
            { name: 'Users', path: '/admin/users', icon: Users },
            { name: 'Settings', path: '/admin/settings', icon: Settings },
            { name: 'Audit Log', path: '/admin/audit', icon: History },
        ],
    },
]

interface SidebarProps {
    open: boolean          // mobile drawer state
    onNavigate: () => void // closes the drawer after a click on mobile
}

const Sidebar: React.FC<SidebarProps> = ({ open, onNavigate }) => {
    const user = useCurrentUser()
    const groups = NAV_GROUPS.filter((group) => !group.adminOnly || user?.role === 'admin')

    return (
        <aside
            className={`fixed bottom-0 left-0 top-16 z-40 w-64 overflow-y-auto border-r border-gray-200 bg-white shadow-sm transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <nav className="space-y-5 p-4">
                {groups.map((group) => (
                    <div key={group.title}>
                        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.title}</p>
                        <div className="space-y-1">
                            {group.items.map(({ name, path, icon: Icon }) => (
                                <NavLink
                                    key={path}
                                    to={path}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-green-800 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-green-800'
                                        }`
                                    }
                                >
                                    <Icon size={18} className="shrink-0" aria-hidden />
                                    {name}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    )
}

export default Sidebar
