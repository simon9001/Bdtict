import Swal from 'sweetalert2'

/**
 * Confirmation dialog for destructive actions (delete, undo).
 * Resolves true only when the user clicks the confirm button.
 */
export const confirmAction = async (title: string, text: string, confirmText = 'Yes, delete'): Promise<boolean> => {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: confirmText,
        confirmButtonColor: '#b91c1c',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
    })
    return result.isConfirmed
}
