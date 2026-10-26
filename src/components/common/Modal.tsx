import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
    open: boolean
    title: string
    onClose: () => void
    children: React.ReactNode
    size?: 'md' | 'lg' | 'xl'
}

const SIZES = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

// Centered dialog (daisyUI modal). Closes on Escape or backdrop click.
const Modal: React.FC<ModalProps> = ({ open, title, onClose, children, size = 'lg' }) => {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={title}>
            <div className={`modal-box w-11/12 ${SIZES[size]} p-0`}>
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
            </div>
            <div className="modal-backdrop bg-black/40" onClick={onClose} />
        </div>
    )
}

export default Modal
