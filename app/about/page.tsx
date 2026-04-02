// Copyright (c) 2026 outercircl. All rights reserved.

import Image from 'next/image'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn why outercircl was built and how it helps people discover local activities and meaningful community.',
  alternates: {
    canonical: '/about',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#1A1A1A]">
      <div className="bg-[#eb1242] px-4 py-4 text-white sm:py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-4 text-center">
          <div className="space-y-0.5 leading-tight">
            <p className="text-sm font-semibold tracking-tight sm:text-base">
              Sign up today for exclusive offers for Beta version
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
              href="/about"
              aria-current="page"
              className="px-1 text-sm font-semibold text-[#eb1242]"
            >
              Our Story
            </Link>
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

      <main className="px-5 pb-24 pt-16 sm:px-7 sm:pt-20">
        <section className="mx-auto w-full max-w-[680px]">
          <p className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#E8432D]">
            Our Story
          </p>

          <h1 className="mb-12 text-[clamp(2.2rem,5.5vw,3.2rem)] leading-[1.18] font-serif">
            Why we built <em className="text-[#E8432D]">outercircl.</em>
          </h1>

          <div className="mb-12 h-0.5 w-12 bg-[#E8432D]" />

          <article className="space-y-7 text-[17px] leading-[1.75] text-[#555]">
            <p>We moved to Galway with a thirst for adventure.</p>

            <p>
              At the start, it felt daunting attending activities or events without anyone we knew.
              Over time we were lucky enough to forge a brilliant group of friends and finally felt
              like we had a circle with which we could experience the best of what Galway had to
              offer.
            </p>

            <p className="my-10 border-l-[3px] border-[#FDE8E5] pl-6 text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.4] font-serif italic text-[#E8432D]">
              This solidified one of our core values - life is more fun when shared with others.
            </p>

            <p>
              I created outercircl because everyone deserves access to that kind of circle - one
              that you can easily join or build, whenever and wherever works for you.
            </p>

            <p>
              outercircl lets you browse or create your own small, activity-based groups with
              like-minded people around your interests. Looking for someone to join you on a run on
              the prom, morning cold dips, or neighbourhood toddler meetups? We make it as easy to
              organise as ordering takeaway. Browse, join, show up.
            </p>

            <p>
              Galway showed me what real community can feel like when you step out and experience it
              - and I want to help others do that too.
            </p>

            <p className="text-[clamp(1.1rem,2.5vw,1.3rem)] font-serif font-normal text-[#1A1A1A]">
              The first step is always the hardest - we&apos;ve just made it a whole lot smaller.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}
