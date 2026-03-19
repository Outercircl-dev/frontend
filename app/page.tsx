import Image from 'next/image'
import type { Metadata } from 'next'
import Link from 'next/link'

import { HeroActivityCarousel } from '@/components/home/hero-activity-carousel'
import { HeroCtaButtons } from '@/components/home/hero-cta-buttons'
import { FeaturedActivitiesCarousel } from '@/components/home/featured-activities-carousel'

export const metadata: Metadata = {
    title: 'OuterCircl | Discover Your Next Activity',
    description:
        'Discover local meetups, family-friendly events, and real community activities with OuterCircl.',
    alternates: {
        canonical: '/',
    },
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OuterCircl',
    url: 'https://outercircl.com',
    description: 'Discover and join local activities hosted by trusted communities.',
    publisher: {
        '@type': 'Organization',
        name: 'OuterCircl',
        logo: 'https://outercircl.com/logo.png',
    },
}

export default function Home() {
    return (
        <div className="bg-[#f4f4f6] text-[#25253b]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="bg-[#eb1242] px-4 py-4 text-white sm:py-5">
                <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-4 text-center">
                    <div className="space-y-0.5 leading-tight">
                        <p className="text-sm font-semibold tracking-tight sm:text-base">
                            Sign up to the buzz today for exclusive discounts
                        </p>
                        <p className="text-[11px] font-medium text-white/90 sm:text-xs">
                            Beta Version - Sign up today for Premium Membership offers!
                        </p>
                    </div>
                    <Link
                        href="/login"
                        className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#eb1242] shadow-sm transition hover:bg-white/90 sm:text-sm"
                    >
                        Join now
                    </Link>
                </div>
            </div>

            <header className="sticky top-0 z-30 border-b border-[#ececf2]/80 bg-white/95 px-4 py-4 shadow-[0_1px_0_rgba(24,24,36,0.04)] backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
                    <Link href="/" aria-label="OuterCircl home">
                        <Image
                            src="/logo.png"
                            alt="OuterCircl"
                            width={140}
                            height={40}
                            className="h-10 w-auto"
                            priority
                        />
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/login"
                            className="rounded-full border border-[#eb1242]/35 px-4 py-2 text-sm font-semibold text-[#eb1242] transition hover:bg-[#fff1f5]"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-full bg-[#eb1242] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d70f3d]"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="flex min-h-[calc(100svh-8.5rem)] items-center bg-white px-4 pb-18 pt-14 sm:min-h-[calc(100svh-9.5rem)] sm:pb-20 sm:pt-20">
                    <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
                        <HeroActivityCarousel />
                        <HeroCtaButtons />
                    </div>
                </section>

                <FeaturedActivitiesCarousel />

                <section id="how-it-works" className="scroll-mt-24 bg-[#eee6c3] px-4 py-16 sm:py-20">
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
                        <div className="relative h-64 overflow-hidden rounded-3xl sm:h-72 lg:h-80">
                            <Image
                                src="/landing/how-it-works-search.svg"
                                alt="People discovering activities"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                        </div>
                        <div className="space-y-5">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b6f53]">
                                How it works
                            </p>
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#2d2d40] sm:text-4xl">
                                Search for an activity
                            </h2>
                            <p className="max-w-xl text-sm leading-7 text-[#4b4b60] sm:text-base">
                                Tell us your interests and we show local plans that match your
                                vibe. From family-friendly mornings to fitness evenings, your feed
                                updates in real time.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex rounded-full bg-[#eb1242] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d70f3d]"
                            >
                                Learn more
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="bg-[#c9efc6] px-4 py-16 sm:py-20">
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
                        <div className="order-2 space-y-5 lg:order-1">
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#2d2d40] sm:text-4xl">
                                Save ideas you like
                            </h2>
                            <p className="max-w-xl text-sm leading-7 text-[#3d4a46] sm:text-base">
                                Bookmark activities as you browse and keep your week planned.
                                OuterCircl remembers what you enjoyed so finding your next meetup is
                                even faster.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex rounded-full bg-[#eb1242] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d70f3d]"
                            >
                                Explore groups
                            </Link>
                        </div>
                        <div className="order-1 grid grid-cols-2 gap-4 lg:order-2">
                            <div className="relative h-44 overflow-hidden rounded-2xl sm:h-52">
                                <Image
                                    src="/landing/save-ideas-main.svg"
                                    alt="Saved activity preview"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 50vw, 25vw"
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="relative h-20 overflow-hidden rounded-2xl sm:h-24">
                                    <Image
                                        src="/landing/save-ideas-card-one.svg"
                                        alt="Saved item card"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 50vw, 25vw"
                                    />
                                </div>
                                <div className="relative h-20 overflow-hidden rounded-2xl sm:h-24">
                                    <Image
                                        src="/landing/save-ideas-card-two.svg"
                                        alt="Community favorites card"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 50vw, 25vw"
                                    />
                                </div>
                                <div className="relative h-20 overflow-hidden rounded-2xl sm:h-24">
                                    <Image
                                        src="/landing/save-ideas-card-three.svg"
                                        alt="Recommended activity card"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 50vw, 25vw"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[#eee6c3] px-4 py-16 sm:py-20">
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
                        <div className="relative h-64 overflow-hidden rounded-3xl sm:h-72 lg:h-80">
                            <Image
                                src="/landing/connect-friends.svg"
                                alt="Friends coordinating activities"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                        </div>
                        <div className="space-y-5">
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#2d2d40] sm:text-4xl">
                                Connect with activity friends
                            </h2>
                            <p className="max-w-xl text-sm leading-7 text-[#4b4b60] sm:text-base">
                                Organize plans in one place, chat with your group, and receive
                                reminders before your meetup starts.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex rounded-full bg-[#eb1242] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d70f3d]"
                            >
                                Download app
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white px-4 py-12 text-sm text-[#5f5f75] sm:py-14">
                <div className="mx-auto grid w-full max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-base font-bold text-[#eb1242]">OuterCircl</p>
                        <p className="mt-2">Find your people through trusted local activities.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-[#2f2f45]">Community</p>
                        <ul className="mt-2 space-y-2">
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Activities
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Hosts
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Groups
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-semibold text-[#2f2f45]">Company</p>
                        <ul className="mt-2 space-y-2">
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Careers
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-semibold text-[#2f2f45]">Legal</p>
                        <ul className="mt-2 space-y-2">
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Terms
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Privacy
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-[#eb1242]">
                                    Community Guidelines
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    )
}
