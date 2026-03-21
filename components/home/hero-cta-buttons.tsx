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
                className="rounded-full bg-[#eb1242] px-7 py-3 text-base font-semibold text-white shadow-[0_8px_18px_rgba(235,18,66,0.28)] transition hover:-translate-y-0.5 hover:bg-[#d70f3d] hover:shadow-[0_10px_22px_rgba(215,15,61,0.32)]"
            >
                Join us today
            </Link>
            <button
                type="button"
                onClick={scrollToHowItWorks}
                className="cursor-pointer rounded-full border border-[#d7d7e1] bg-white px-7 py-3 text-base font-semibold text-[#49495f] shadow-[0_8px_18px_rgba(38,40,60,0.12)] transition hover:-translate-y-0.5 hover:border-[#b8b8c8] hover:shadow-[0_10px_22px_rgba(38,40,60,0.16)]"
            >
                How it works
            </button>
        </div>
    )
}
