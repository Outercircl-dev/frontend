'use client'

import Link from 'next/link'

export function HeroCtaButtons() {
    const scrollToHowItWorks = () => {
        const section = document.getElementById('how-it-works')
        if (!section) return

        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        })
    }

    return (
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3.5">
            <Link
                href="/login"
                className="rounded-full bg-[#eb1242] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d70f3d]"
            >
                Join us today
            </Link>
            <button
                type="button"
                onClick={scrollToHowItWorks}
                className="cursor-pointer rounded-full border border-[#d7d7e1] bg-white px-6 py-2 text-sm font-semibold text-[#49495f] transition hover:border-[#b8b8c8]"
            >
                How it works
            </button>
        </div>
    )
}
