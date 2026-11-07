import React from 'react'
import { NavLink } from 'react-router'
import {
    BarChart3, Briefcase, ClipboardList, CreditCard, FileSignature, FileText, History, LayoutDashboard, Lightbulb,
    ListChecks, ListTodo, Receipt, Repeat, Server, Settings, Table2, Users, Wallet, Wrench, type LucideIcon,
} from 'lucide-react'
import { useCurrentUser } from '../store/hooks'
import type { UserRole } from '../types/Types'

interface NavItem {
    name: string
    path: string
    icon: LucideIcon
    roles?: UserRole[] // leave out for everyone
}

interface NavGroup {
    title: string
    items: NavItem[]
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
        // One entry per sheet of the tracker workbook, named and ordered as its tabs
        title: 'Tracker Sheets',
        items: [
            { name: 'Lists', path: '/lists', icon: ListChecks },
            { name: 'Procurement of Assets_All list', path: '/tracker/all-list', icon: Table2 },
            { name: 'Procurement of Assets_Infra, Sw', path: '/tracker/assets-infra-sw', icon: Server },
            { name: 'Maintenance & Support', path: '/tracker/maintenance-support', icon: Wrench },
            { name: 'Consultancy', path: '/tracker/consultancy', icon: Lightbulb },
            { name: 'Subscription & Support', path: '/tracker/subscription-support', icon: Repeat },
        ],
    },
    {
        title: 'Tracking',
        items: [
            { name: 'Memos', path: '/memos', icon: FileText },
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
        items: [
            { name: 'Users', path: '/admin/users', icon: Users, roles: ['sa'] },
            { name: 'Settings', path: '/admin/settings', icon: Settings, roles: ['sa', 'admin'] },
            { name: 'Audit Log', path: '/admin/audit', icon: History, roles: ['sa', 'admin'] },
        ],
    },
]

interface SidebarProps {
    drawerOpen: boolean    // small screens: is the drawer showing
    collapsed: boolean     // large screens: icons only
    onNavigate: () => void // closes the drawer after a click on small screens
}

// The "lg:" classes keep "collapsed" from affecting the small-screen drawer,
// which always shows full labels.
const Sidebar: React.FC<SidebarProps> = ({ drawerOpen, collapsed, onNavigate }) => {
    const user = useCurrentUser()
    // Only the items this role may open; a group with none left is hidden
    const groups = NAV_GROUPS
        .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role))) }))
        .filter((group) => group.items.length > 0)

    return (
        <aside
            className={`fixed bottom-0 left-0 top-16 z-40 w-64 overflow-y-auto overflow-x-hidden border-r border-gray-200 bg-white shadow-sm transition-[width,transform] duration-300 lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-16' : ''}`}
        >
            <nav className={`space-y-5 p-4 ${collapsed ? 'lg:space-y-3 lg:px-2' : ''}`}>
                {groups.map((group, index) => (
                    <div key={group.title}>
                        <p className={`mb-1 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${collapsed ? 'lg:hidden' : ''}`}>{group.title}</p>
                        {/* Icons only: a thin line replaces the group title */}
                        {collapsed && index > 0 && <hr className="mb-3 hidden border-gray-200 lg:block" />}
                        <div className="space-y-1">
                            {group.items.map(({ name, path, icon: Icon }) => (
                                <NavLink
                                    key={path}
                                    to={path}
                                    onClick={onNavigate}
                                    title={collapsed ? name : undefined}
                                    aria-label={name}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${isActive
                                            ? 'bg-green-800 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-green-800'
                                        }`
                                    }
                                >
                                    <Icon size={18} className="shrink-0" aria-hidden />
                                    {/* The longer sheet names wrap rather than being cut off */}
                                    <span className={`whitespace-normal leading-snug ${collapsed ? 'lg:hidden' : ''}`}>{name}</span>
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
