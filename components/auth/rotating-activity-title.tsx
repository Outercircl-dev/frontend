'use client'

import { useEffect, useMemo, useState } from 'react'

const ACTIVITIES = ['Ocean Dip', '3K Run', 'Coffee Chats']
const ROTATE_INTERVAL = 2800
const OFFSET = 2 // number of items visible at once for seamless loop

export function RotatingActivityTitle() {
    const phrases = useMemo(() => [...ACTIVITIES, ...ACTIVITIES.slice(0, OFFSET)], [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(true)

    useEffect(() => {
        const id = window.setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= ACTIVITIES.length) {
                    setIsTransitioning(false)
                    return 1
                }
                setIsTransitioning(true)
                return prev + 1
            })
        }, ROTATE_INTERVAL)
        return () => window.clearInterval(id)
    }, [])

    return (
        <div className="space-y-3">
            <p className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                Your next activity
            </p>
            <div className="relative h-16 overflow-hidden sm:h-20">
                <div
                    className="flex h-full items-center text-4xl font-bold text-primary transition-all duration-700 ease-in-out sm:text-5xl"
                    style={{
                        transform: `translateX(-${currentIndex * 100}%)`,
                        transitionProperty: isTransitioning
                            ? 'transform'
                            : 'none',
                    }}
                    onTransitionEnd={() => {
                        if (!isTransitioning) {
                            setIsTransitioning(true)
                        }
                    }}
                >
                    {phrases.map((phrase, index) => (
                        <span key={`${phrase}-${index}`} className="min-w-full text-left">
                            {phrase}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}


