'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRef, useState } from 'react'

type FeaturedEvent = {
    id: string
    title: string
    description: string
    imageUrl: string
    date: string
    time: string
    location: string
    categories: string[]
}

const HOMEPAGE_IMAGES = {
    COLD_PLUNGE: '/landing/featured-cold-plunge.svg',
    TODDLER_MEETUP: '/landing/featured-family-park.svg',
    JOGGING: '/landing/featured-run-club.svg',
    COFFEE_CODE: '/landing/featured-coffee.svg',
    HIKING: '/landing/featured-family-park.svg',
} as const

const featuredEvents: FeaturedEvent[] = [
    {
        id: 'sample-1',
        title: 'Salthill Cold Plunge',
        description:
            'Join us for an invigorating cold water plunge at Salthill beach. Perfect for building mental resilience and connecting with like-minded people.',
        imageUrl: HOMEPAGE_IMAGES.COLD_PLUNGE,
        date: '2025-01-08',
        time: '08:00',
        location: 'Salthill Beach, Galway',
        categories: ['water', 'sports', 'outdoors'],
    },
    {
        id: 'sample-2',
        title: 'Tuesday Toddler Meetup at Millennium Playground',
        description:
            'Weekly gathering for parents and toddlers. Let the little ones play while parents connect and share parenting tips.',
        imageUrl: HOMEPAGE_IMAGES.TODDLER_MEETUP,
        date: '2025-01-07',
        time: '10:30',
        location: 'Millennium Playground, Galway',
        categories: ['family', 'social'],
    },
    {
        id: 'sample-3',
        title: '3K Jog at Salthill Prom',
        description:
            'Easy-paced 3km jog along the beautiful Salthill Promenade. All fitness levels welcome, perfect for beginners.',
        imageUrl: HOMEPAGE_IMAGES.JOGGING,
        date: '2025-01-06',
        time: '18:30',
        location: 'Salthill Promenade, Galway',
        categories: ['water', 'sports', 'outdoors'],
    },
    {
        id: 'sample-4',
        title: 'Coffee & Code Meetup',
        description:
            'Casual meetup for developers and tech enthusiasts. Bring your laptop and work on projects together.',
        imageUrl: HOMEPAGE_IMAGES.COFFEE_CODE,
        date: '2025-01-09',
        time: '14:00',
        location: 'The Huntsman Pub, Galway',
        categories: ['professional', 'social', 'food'],
    },
    {
        id: 'sample-5',
        title: 'Weekend Hiking Group',
        description:
            'Explore the beautiful trails around Galway. Moderate difficulty level, perfect for weekend warriors.',
        imageUrl: HOMEPAGE_IMAGES.HIKING,
        date: '2025-01-11',
        time: '09:00',
        location: 'Connemara National Park',
        categories: ['outdoors', 'sports'],
    },
]

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-IE', {
        day: '2-digit',
        month: 'short',
    })
}

export function FeaturedActivitiesCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [activeStep, setActiveStep] = useState(0)

    const scrollByCard = (direction: 'prev' | 'next') => {
        const container = scrollRef.current
        if (!container) return

        const cards = container.querySelectorAll<HTMLElement>('[data-card]')
        if (cards.length === 0) return

        const stride =
            cards.length > 1
                ? Math.abs(cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left)
                : cards[0].offsetWidth

        const maxScroll = container.scrollWidth - container.clientWidth
        const maxStep = Math.max(1, Math.round(maxScroll / stride))

        const nextStep =
            direction === 'next'
                ? (activeStep + 1) % (maxStep + 1)
                : (activeStep - 1 + (maxStep + 1)) % (maxStep + 1)

        setActiveStep(nextStep)
        container.scrollTo({
            left: nextStep * stride,
            behavior: 'smooth',
        })
    }

    return (
        <section id="featured" className="bg-white px-4 pb-14 pt-6 sm:pb-16">
            <div className="mx-auto w-full max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-gray-800">Featured Activities</h2>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#E60023] transition hover:text-[#D50C22]"
                    >
                        See all
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div
                    ref={scrollRef}
                    className="scrollbar-hide -mx-2 flex snap-x snap-mandatory gap-0 overflow-x-auto px-2 md:-mx-4 md:px-4"
                >
                    {featuredEvents.map((event) => (
                        <article
                            key={event.id}
                            data-card
                            className="w-full shrink-0 snap-start px-2 sm:w-1/2 md:px-4 lg:w-1/3 xl:w-1/4"
                        >
                            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#ececf3] bg-white shadow-[0_10px_24px_rgba(26,29,45,0.08)]">
                                <div className="relative h-44 w-full">
                                    <Image
                                        src={event.imageUrl}
                                        alt={event.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    />
                                </div>
                                <div className="flex h-full flex-col p-4 text-sm">
                                    <h3 className="line-clamp-2 min-h-[2.8rem] text-base font-semibold text-[#22243a]">
                                        {event.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-[#5d6078]">
                                        {event.description}
                                    </p>
                                    <div className="mt-3 text-xs font-medium text-[#6f7290]">
                                        {formatDate(event.date)} · {event.time}
                                    </div>
                                    <p className="mt-1 line-clamp-1 min-h-[1rem] text-xs text-[#7a7d94]">
                                        {event.location}
                                    </p>
                                    <div className="mt-3 min-h-7">
                                        <div className="flex flex-wrap gap-1.5">
                                        {event.categories.slice(0, 2).map((category) => (
                                            <span
                                                key={`${event.id}-${category}`}
                                                className="rounded-full bg-[#f5f6fb] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#6e7089]"
                                            >
                                                {category}
                                            </span>
                                        ))}
                                        </div>
                                    </div>
                                    <Link
                                        href="/login"
                                        className="mt-auto inline-flex items-center justify-center rounded-full bg-[#ed3551] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d80f33]"
                                    >
                                        Sign in to join
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-6 flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => scrollByCard('prev')}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-transparent text-[#4a4f6d] transition hover:bg-gray-100"
                        aria-label="Previous featured activity"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollByCard('next')}
                        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-transparent text-[#4a4f6d] transition hover:bg-gray-100"
                        aria-label="Next featured activity"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </section>
    )
}
