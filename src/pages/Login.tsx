import React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast, Toaster } from 'sonner'
import { BarChart3, ClipboardList, Landmark, Receipt } from 'lucide-react'
import { authApi } from '../features/api/AuthApi'
import { setCredentials } from '../features/slice/AuthSlice'
import { useAppDispatch } from '../store/hooks'
import { getErrorMessage } from '../utils/errors'
import { inputClass } from '../components/common/FormField'
import type { LoginFormValues } from '../types/Types'

// What staff can do - shown on the left panel
const HIGHLIGHTS = [
    { icon: ClipboardList, text: 'Track every procurement from memo to payment' },
    { icon: Receipt, text: 'Record contracts, invoices and payments' },
    { icon: BarChart3, text: 'See budget and progress across financial years' },
]

const Login: React.FC = () => {
    // RTK Query mutation hook for login
    const [loginUser, { isLoading }] = authApi.useLoginMutation()

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>()
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const location = useLocation()

    // Page the user tried to open before being sent to login
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'

    const handleLogin: SubmitHandler<LoginFormValues> = async (values) => {
        try {
            const response = await loginUser(values).unwrap()
            const { token, user, expires_in } = response.data
            dispatch(setCredentials({ token, user, expiresIn: expires_in }))
            toast.success(`Welcome back, ${user.full_name.split(' ')[0]}`)
            navigate(redirectTo, { replace: true })
        } catch (error) {
            toast.error(getErrorMessage(error, 'Login failed'))
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <Toaster position="top-right" richColors />
            <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
                {/* Info panel */}
                <div className="hidden flex-col justify-between bg-green-800 p-10 text-white lg:flex">
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-white/15 p-2"><Landmark size={28} aria-hidden /></span>
                        <span className="text-xl font-bold">ICT Budget Tracker</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold leading-tight">ICT Department<br />Budget & Procurement</h2>
                        <ul className="mt-8 space-y-4">
                            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-3 text-green-50">
                                    <span className="rounded-lg bg-white/10 p-2"><Icon size={18} aria-hidden /></span>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-sm text-green-200">For ICT department staff only.</p>
                </div>

                {/* Form */}
                <div className="flex items-center justify-center p-8 sm:p-12">
                    <div className="w-full max-w-sm">
                        <div className="mb-8 text-center">
                            <h1 className="mb-2 text-3xl font-bold text-green-800">Welcome back</h1>
                            <p className="text-gray-500">Sign in with your work email</p>
                        </div>

                        <form className="flex flex-col gap-5" onSubmit={handleSubmit(handleLogin)} noValidate>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    placeholder="name@organisation.go.ke"
                                    className={`${inputClass} py-3`}
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                                    })}
                                />
                                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    className={`${inputClass} py-3`}
                                    {...register('password', { required: 'Password is required' })}
                                />
                                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 w-full rounded-lg bg-green-800 px-4 py-3.5 font-semibold text-white shadow-md transition hover:bg-green-900 hover:shadow-lg disabled:opacity-70"
                            >
                                {isLoading ? <span className="loading loading-spinner loading-sm" /> : 'Sign in'}
                            </button>

                            <p className="text-center text-sm text-gray-500">
                                Forgot your password? Ask the Head of ICT to reset it.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
