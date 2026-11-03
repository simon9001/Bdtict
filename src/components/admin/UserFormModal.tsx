import React, { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'
import Modal from '../common/Modal'
import { FormActions, FormField, inputClass } from '../common/FormField'
import { optionalText } from '../../utils/form'
import { userApi } from '../../features/api/UserApi'
import type { User, UserFormValues } from '../../types/Types'
import { getErrorMessage } from '../../utils/errors'

interface UserFormModalProps {
    open: boolean
    onClose: () => void
    user?: User // edit mode
}

// The system administrator creates staff accounts here (there is no self-registration)
const UserFormModal: React.FC<UserFormModalProps> = ({ open, onClose, user }) => {
    const isEdit = !!user
    const [createUser, { isLoading: creating }] = userApi.useCreateUserMutation()
    const [updateUser, { isLoading: updating }] = userApi.useUpdateUserMutation()
    const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>()

    useEffect(() => {
        if (!open) return
        reset(user
            ? { full_name: user.full_name, email: user.email, phone_number: user.phone_number, role: user.role, is_active: user.is_active }
            : { role: 'officer' })
    }, [open, user, reset])

    const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
        try {
            if (isEdit) {
                const { password: _password, ...changes } = values
                await updateUser({ user_id: user.user_id, ...changes }).unwrap()
                toast.success('Account updated')
            } else {
                await createUser(values).unwrap()
                toast.success('Account created - share the temporary password with the officer')
            }
            onClose()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${user.full_name}` : 'New staff account'} size="md">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <FormField label="Full name" required error={errors.full_name?.message}>
                    <input className={inputClass} {...register('full_name', { required: 'Name is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
                </FormField>
                <FormField label="Work email" required error={errors.email?.message}>
                    <input type="email" className={inputClass}
                        {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Phone">
                        <input className={inputClass} {...register('phone_number', { setValueAs: optionalText })} />
                    </FormField>
                    <FormField label="Role" required>
                        <select className={inputClass} {...register('role')}>
                            <option value="officer">ICT Officer</option>
                            <option value="admin">Head of ICT</option>
                            <option value="sa">System Administrator</option>
                            <option value="viewer">Viewer (read only)</option>
                        </select>
                    </FormField>
                </div>
                {!isEdit && (
                    <FormField label="Temporary password" required error={errors.password?.message}
                        hint="8+ characters with an uppercase letter, a lowercase letter and a number. The officer can change it later.">
                        <input type="text" autoComplete="off" className={inputClass}
                            {...register('password', {
                                required: 'Password is required',
                                minLength: { value: 8, message: 'At least 8 characters' },
                                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Needs an uppercase letter, a lowercase letter and a number' },
                            })} />
                    </FormField>
                )}
                {isEdit && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" className="checkbox checkbox-sm" {...register('is_active')} />
                        Account active (untick to block login - history is kept)
                    </label>
                )}
                <FormActions onCancel={onClose} isSaving={creating || updating} submitLabel={isEdit ? 'Save changes' : 'Create account'} />
            </form>
        </Modal>
    )
}

export default UserFormModal
