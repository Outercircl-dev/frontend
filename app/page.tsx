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
                        Sign Up
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
                            Log in
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-full bg-[#eb1242] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d70f3d]"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="flex min-h-[52svh] items-center bg-white px-4 pb-8 pt-10 sm:min-h-[56svh] sm:pb-10 sm:pt-12">
                    <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
                        <HeroActivityCarousel />
                        <HeroCtaButtons />
                    </div>
                </section>

                <FeaturedActivitiesCarousel />

                <section id="how-it-works" className="scroll-mt-24 bg-[#FEF7CD] px-4 py-14 sm:py-18">
                    <div className="mx-auto w-full max-w-6xl">
                        <div className="mb-10 flex justify-center sm:mb-12">
                            <h2 className="relative inline-block text-center text-3xl font-bold sm:text-4xl md:text-5xl">
                                <span className="relative z-10 text-[#E60023]">How It Works</span>
                                <span className="absolute bottom-1 left-0 z-0 h-3 w-full animate-pulse rounded-[4px] bg-[linear-gradient(90deg,#FFD1DC_0%,#FFEC99_100%)] animation-duration-[3s]" />
                            </h2>
                        </div>

                        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                            <div className="relative h-[460px] w-full">
                                <div className="absolute left-[14%] top-[5%] z-10 h-[210px] w-[210px] rotate-[-8deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                    <Image
                                        src="/landing/food-dining-1.jpg"
                                        alt="People enjoying food together at a social activity"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 40vw"
                                    />
                                </div>
                                <div className="absolute right-[15%] top-[24%] z-20 h-[170px] w-[170px] rotate-[5deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                    <Image
                                        src="/landing/hiking-scenic-1.jpg"
                                        alt="Hikers connecting in nature"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 35vw"
                                    />
                                </div>
                                <div className="absolute bottom-[8%] left-[20%] z-30 h-[190px] w-[190px] rotate-[8deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                    <Image
                                        src="/landing/friends-social-1.jpg"
                                        alt="Friends meeting for a local activity"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 35vw"
                                    />
                                </div>
                                <div className="absolute left-[46%] top-[50%] z-20 h-[150px] w-[150px] rotate-[-5deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                    <Image
                                        src="/landing/group-activity-1.jpg"
                                        alt="Group activity meetup"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, 30vw"
                                    />
                                </div>
                            </div>

                            <div className="space-y-5 sm:space-y-6">
                                <h3 className="text-3xl font-bold leading-tight text-slate-800 sm:text-4xl md:text-5xl">
                                    Search for an activity
                                </h3>
                                <p className="max-w-xl text-lg leading-relaxed text-slate-700 sm:text-xl">
                                    What do you want to try next? Think of something you are into,
                                    like &quot;outdoor yoga&quot; or &quot;board games&quot;, and
                                    see what you find.
                                </p>
                                <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                                    Can&apos;t find something you like? Start an activity yourself
                                    and have others join you.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex rounded-full bg-[#e60023] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#d50c22] hover:shadow-lg"
                                >
                                    Explore activities
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative overflow-hidden bg-[#D0F0C0] px-4 py-14 sm:py-18 lg:py-20">
                    <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(230,0,35,0.1)_0%,rgba(230,0,35,0)_50%)] animation-duration-[4s]" />
                    <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[0.36fr_0.64fr] lg:gap-16">
                        <div className="space-y-5 sm:space-y-6">
                            <h2 className="text-3xl font-bold leading-tight text-[#0A5F55] sm:text-4xl md:text-5xl">
                                Save ideas you like
                            </h2>
                            <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
                                Commit to activities you like. Activities are confirmed once people join.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex rounded-full bg-[#e60023] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#d50c22] hover:shadow-lg"
                            >
                                Explore activities
                            </Link>
                        </div>

                        <div className="relative h-[430px] w-full sm:h-[460px]">
                            <div className="absolute left-0 top-0 h-[90%] w-[56%] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/outdoor-adventure-1.jpg"
                                    alt="Outdoor activities board"
                                    fill
                                    className="object-cover opacity-90"
                                    sizes="(max-width: 1024px) 100vw, 45vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                                    <h3 className="text-xl font-bold leading-tight sm:text-2xl">
                                        Outdoor activities
                                    </h3>
                                    <p className="mt-1 text-sm text-white/90 sm:text-base">
                                        Find your next adventure
                                    </p>
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 h-[40%] w-[33%] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/cooking-class-1.jpg"
                                    alt="Cooking classes card"
                                    fill
                                    className="object-cover opacity-90"
                                    sizes="(max-width: 1024px) 35vw, 20vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                                    <p className="text-sm font-bold sm:text-base">Cooking classes</p>
                                </div>
                            </div>
                            <div className="absolute right-0 top-1/2 h-[20%] w-[33%] -translate-y-1/2 overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-[52%] hover:shadow-xl">
                                <Image
                                    src="/landing/gardening-1.jpg"
                                    alt="Gardening meetup card"
                                    fill
                                    className="object-cover opacity-90"
                                    sizes="(max-width: 1024px) 35vw, 20vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                                    <p className="text-sm font-bold sm:text-base">Gardening meetup</p>
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 h-[40%] w-[33%] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/gaming-1.jpg"
                                    alt="Social gaming nights card"
                                    fill
                                    className="object-cover opacity-90"
                                    sizes="(max-width: 1024px) 35vw, 20vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                                    <p className="text-sm font-bold sm:text-base">Social gaming nights</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative overflow-hidden bg-[#FFF8C5] px-4 py-14 sm:py-18">
                    <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(230,0,35,0.1)_0%,rgba(230,0,35,0)_50%)] animation-duration-[4s]" />
                    <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
                        <div className="relative h-[470px] w-full">
                            <div className="absolute left-[10%] top-[5%] z-10 h-[230px] w-[230px] rotate-[-5deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/friends-laughing-1.jpg"
                                    alt="Friends laughing together"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 100vw, 40vw"
                                />
                            </div>
                            <div className="absolute bottom-[15%] left-[20%] z-30 h-[190px] w-[190px] rotate-[8deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/friends-cafe-1.jpg"
                                    alt="Group hiking and activity meetup"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 100vw, 35vw"
                                />
                            </div>
                            <div className="absolute right-[10%] top-[25%] z-20 h-[170px] w-[170px] rotate-[5deg] overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/group-hiking-feature-1.jpg"
                                    alt="Friends meeting at a cafe"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 100vw, 30vw"
                                />
                            </div>
                            <div className="absolute left-[25%] top-[45%] z-20 h-[150px] w-[150px] -rotate-3 overflow-hidden rounded-3xl shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                                <Image
                                    src="/landing/featured-family-park.svg"
                                    alt="Group gaming and social activities"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 100vw, 30vw"
                                />
                            </div>

                            <div className="absolute left-1/2 top-1/2 z-40 w-[82%] max-w-[305px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-xl">
                                <div className="border-b bg-white px-3 py-2">
                                    <p className="text-sm font-medium text-[#2d2d40]">
                                        Activity Chat
                                    </p>
                                </div>
                                <div className="h-[120px] space-y-2 overflow-y-auto bg-gray-50 px-3 py-2">
                                    <div className="mr-8 rounded-lg bg-white px-2 py-1 text-xs text-slate-700">
                                        Hey! Are we still on for the hike tomorrow?
                                    </div>
                                    <div className="ml-8 rounded-lg bg-[#e60023] px-2 py-1 text-xs text-white">
                                        Absolutely! I&apos;ll bring snacks.
                                    </div>
                                </div>
                                <div className="bg-white p-2">
                                    <div className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-400">
                                        Message...
                                    </div>
                                </div>
                            </div>

                            <div className="absolute left-[34%] top-[22%] z-0 h-[270px] w-[270px] rotate-10 rounded-3xl bg-[#FFBA08]" />
                        </div>

                        <div className="space-y-5 sm:space-y-6">
                            <h2 className="text-3xl font-bold leading-tight text-slate-800 sm:text-4xl md:text-5xl">
                                Connect with activity friends
                            </h2>
                            <p className="max-w-xl text-lg leading-relaxed text-slate-700 sm:text-xl">
                                Chat with your activity buddies once activities are confirmed. Meet
                                up and have a great time!
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex rounded-full bg-[#e60023] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#d50c22] hover:shadow-lg"
                            >
                                Explore activities
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-gray-50 px-4 py-12 text-gray-700">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="mb-8 flex flex-col justify-between gap-8 md:flex-row">
                        <div>
                            <Image
                                src="/logo.png"
                                alt="OuterCircl"
                                width={140}
                                height={40}
                                className="h-8 w-auto"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
                            <div>
                                <p className="mb-4 font-semibold">Company</p>
                                <ul className="space-y-2 text-gray-500">
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            About Us
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            Privacy Policy
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            Terms of Service
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            Contact
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <p className="mb-4 font-semibold">Resources</p>
                                <ul className="space-y-2 text-gray-500">
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            Community Guidelines
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            Help Center
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/login" className="hover:text-[#7a1555]">
                                            The Buzz
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <p className="mb-4 font-semibold">Follow Us</p>
                                <ul className="space-y-2 text-gray-500">
                                    <li>
                                        <a
                                            href="https://www.tiktok.com/@outercircl"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-[#7a1555]"
                                        >
                                            TikTok
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://www.instagram.com/outercircl/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-[#7a1555]"
                                        >
                                            Instagram
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
                        <p>&copy; 2026 outercircl. All rights reserved.</p>
                    </div>
                </div>
            </footer>

        </div>
    )
}
