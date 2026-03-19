'use client'

import { useEffect, useMemo, useState } from 'react'

const ACTIVITIES = ['Tues Toddler Meetup', 'Beach Cleanup', 'Ocean Dip', '3K Jog']
const ROTATE_INTERVAL = 2600

export function HeroActivityCarousel() {
    const phrases = useMemo(() => [...ACTIVITIES, ACTIVITIES[0]], [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(true)

    useEffect(() => {
        const id = window.setInterval(() => {
            setCurrentIndex((prev) => prev + 1)
        }, ROTATE_INTERVAL)

        return () => window.clearInterval(id)
    }, [])

    return (
        <div className="mx-auto w-full max-w-5xl text-center">
            <p className="text-[clamp(1.85rem,5.9vw,3.7rem)] font-extrabold leading-[0.98] tracking-tight text-[#2f3341]">
                your next activity
            </p>
            <div className="mt-7 h-[clamp(3.2rem,8.4vw,5.9rem)] overflow-hidden">
                <div
                    className="flex h-full items-center text-[clamp(2.7rem,7.8vw,5.4rem)] font-extrabold leading-[1.02] tracking-tight text-[#e44361]"
                    style={{
                        transform: `translateX(-${currentIndex * 100}%)`,
                        transitionProperty: isTransitioning ? 'transform' : 'none',
                        transitionDuration: '700ms',
                        transitionTimingFunction: 'ease-in-out',
                    }}
                    onTransitionEnd={() => {
                        // Seamless loop: animate into the cloned first slide,
                        // then jump back to real first slide without animation.
                        if (currentIndex !== ACTIVITIES.length) return
                        setIsTransitioning(false)
                        setCurrentIndex(0)
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => setIsTransitioning(true))
                        })
                    }}
                    aria-live="polite"
                >
                    {phrases.map((phrase, index) => (
                        <span key={`${phrase}-${index}`} className="min-w-full text-center">
                            {phrase}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}
