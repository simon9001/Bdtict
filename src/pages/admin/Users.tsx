import React, { useState } from 'react'
import Swal from 'sweetalert2'
import { toast } from 'sonner'
import { KeyRound, Pencil, Plus } from 'lucide-react'
import { userApi } from '../../features/api/UserApi'
import { useCurrentUser } from '../../store/hooks'
import type { User } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'
import { formatDateTime } from '../../utils/format'
import PageHeader from '../../components/common/PageHeader'
import { IconButton, PrimaryButton } from '../../components/common/Buttons'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States'
import UserFormModal from '../../components/admin/UserFormModal'

const ROLE_BADGES = {
    admin: 'bg-green-100 text-green-800',
    officer: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-700',
}
const ROLE_LABELS = { admin: 'Head of ICT', officer: 'ICT Officer', viewer: 'Viewer' }

// Staff accounts - Head of ICT only
const Users: React.FC = () => {
    const currentUser = useCurrentUser()
    const { data, isLoading, error, refetch } = userApi.useGetAllUsersQuery()
    const [resetPassword] = userApi.useResetPasswordMutation()
    const [form, setForm] = useState<{ open: boolean; user?: User }>({ open: false })

    const handleResetPassword = async (user: User) => {
        const { value: newPassword } = await Swal.fire({
            title: `Reset password for ${user.full_name}`,
            input: 'text',
            inputLabel: 'New temporary password',
            inputPlaceholder: 'e.g. Welcome2026',
            showCancelButton: true,
            confirmButtonText: 'Reset password',
            confirmButtonColor: '#166534',
            inputValidator: (value) =>
                !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value) ? '8+ characters with an uppercase letter, a lowercase letter and a number' : null,
        })
        if (!newPassword) return
        try {
            await resetPassword({ user_id: user.user_id, new_password: newPassword }).unwrap()
            toast.success(`Password reset. Share it with ${user.full_name} securely.`)
        } catch (err) {
            toast.error(getErrorMessage(err))
        }
    }

    const users = data?.data ?? []

    return (
        <>
            <PageHeader
                title="Users"
                subtitle="ICT department staff who can log in"
                actions={<PrimaryButton icon={<Plus size={16} />} onClick={() => setForm({ open: true })}>New account</PrimaryButton>}
            />
            <div className="rounded-lg bg-white shadow-sm">
                {isLoading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={refetch} /> : users.length === 0 ? <EmptyState message="No accounts yet." /> : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr><th>Name</th><th>Role</th><th>Status</th><th>Last login</th><th /></tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.user_id} className={u.is_active ? '' : 'opacity-60'}>
                                        <td>
                                            <p className="font-medium text-gray-900">{u.full_name}{u.user_id === currentUser?.user_id && <span className="ml-1 text-xs text-gray-500">(you)</span>}</p>
                                            <p className="text-xs text-gray-500">{u.email}{u.phone_number ? ` · ${u.phone_number}` : ''}</p>
                                        </td>
                                        <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGES[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                                        <td className="text-sm">{u.is_active ? 'Active' : 'Deactivated'}</td>
                                        <td className="text-sm text-gray-600">{u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</td>
                                        <td className="whitespace-nowrap text-right">
                                            <IconButton label="Edit" onClick={() => setForm({ open: true, user: u })}><Pencil size={15} /></IconButton>
                                            <IconButton label="Reset password" onClick={() => handleResetPassword(u)}><KeyRound size={15} /></IconButton>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <UserFormModal open={form.open} user={form.user} onClose={() => setForm({ open: false })} />
        </>
    )
}

export default Users
