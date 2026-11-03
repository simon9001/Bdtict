import React, { useEffect, useRef, useState } from 'react'

/**
 * Draws its content only when it is about to scroll into view, then keeps it.
 * A page full of charts opens at once this way: nothing far below the screen is
 * drawn or fetched until someone gets near it.
 */
const RenderWhenNear: React.FC<{ minHeight?: number; children: React.ReactNode }> = ({ minHeight = 320, children }) => {
    const holder = useRef<HTMLDivElement>(null)
    const [near, setNear] = useState(false)

    useEffect(() => {
        const element = holder.current
        if (!element || near) return
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry?.isIntersecting) setNear(true) },
            { rootMargin: '400px' },
        )
        observer.observe(element)
        return () => observer.disconnect()
    }, [near])

    if (near) return <>{children}</>
    return <div ref={holder} className="rounded-lg bg-white shadow-sm" style={{ minHeight }} aria-hidden />
}

export default RenderWhenNear
