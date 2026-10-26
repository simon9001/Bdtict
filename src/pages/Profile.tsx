import React from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import { authApi } from '../features/api/AuthApi'
import { useCurrentUser } from '../store/hooks'
import { getErrorMessage } from '../utils/errors'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import { FormField, inputClass } from '../components/common/FormField'

const ROLE_LABELS = { admin: 'Head of ICT (administrator)', officer: 'ICT Officer', viewer: 'Viewer (read only)' }

type PasswordForm = { current_password: string; new_password: string; confirm_password: string }

// Own profile and password change
const Profile: React.FC = () => {
    const user = useCurrentUser()
    const [changePassword, { isLoading }] = authApi.useChangePasswordMutation()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>()

    const onSubmit: SubmitHandler<PasswordForm> = async ({ current_password, new_password }) => {
        try {
            await changePassword({ current_password, new_password }).unwrap()
            toast.success('Password changed')
            reset()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <>
            <PageHeader title="My profile" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Account">
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{user?.full_name}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-medium">{user?.email}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-medium">{user ? ROLE_LABELS[user.role] : ''}</dd></div>
                    </dl>
                    <p className="mt-4 text-xs text-gray-500">To change your name, email or role, ask the Head of ICT.</p>
                </Card>

                <Card title="Change password">
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                        <FormField label="Current password" required error={errors.current_password?.message}>
                            <input type="password" autoComplete="current-password" className={inputClass}
                                {...register('current_password', { required: 'Current password is required' })} />
                        </FormField>
                        <FormField label="New password" required error={errors.new_password?.message}
                            hint="At least 8 characters with an uppercase letter, a lowercase letter and a number">
                            <input type="password" autoComplete="new-password" className={inputClass}
                                {...register('new_password', {
                                    required: 'New password is required',
                                    minLength: { value: 8, message: 'At least 8 characters' },
                                    pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Needs an uppercase letter, a lowercase letter and a number' },
                                })} />
                        </FormField>
                        <FormField label="Confirm new password" required error={errors.confirm_password?.message}>
                            <input type="password" autoComplete="new-password" className={inputClass}
                                {...register('confirm_password', { validate: (value, all) => value === all.new_password || 'Passwords do not match' })} />
                        </FormField>
                        <button type="submit" className="btn border-none bg-green-800 text-white hover:bg-green-900" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Change password'}
                        </button>
                    </form>
                </Card>
            </div>
        </>
    )
}

export default Profile
