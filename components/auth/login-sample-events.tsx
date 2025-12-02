import Image from 'next/image'
import { CalendarDays, MapPin } from 'lucide-react'

const SAMPLE_EVENTS = [
    {
        title: 'Salthill Cold Plunge',
        description: 'Build resilience with an invigorating sunrise dip.',
        when: 'Wed · 08:00',
        where: 'Salthill Beach',
        image: '/login/salthill.png',
    },
    {
        title: 'Coffee & Code Meetup',
        description: 'Co-work on side projects with the Galway crew.',
        when: 'Thu · 14:00',
        where: 'The Huntsman Pub',
        image: '/login/coffee_code.png',
    },
    {
        title: 'Weekend Hiking Group',
        description: 'Moderate 8km trail through Connemara National Park.',
        when: 'Sat · 09:00',
        where: 'Lettergesh Trailhead',
        image: '/login/3K_run.png',
    },
]

export function LoginSampleEvents() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Coming up
                    </p>
                    <h3 className="text-lg font-semibold text-foreground">Featured community activities</h3>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    12 spots left
                </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                {SAMPLE_EVENTS.map((event) => (
                    <article key={event.title} className="group relative overflow-hidden rounded-3xl">
                        <div className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/40 to-black/0" />
                        <Image
                            src={event.image}
                            alt={event.title}
                            width={420}
                            height={320}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            sizes="(min-width: 768px) 33vw, 100vw"
                        />
                        <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 text-white">
                            <div className="space-y-2">
                                <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
                                    {event.when}
                                </span>
                                <h4 className="text-lg font-semibold">{event.title}</h4>
                                <p className="text-sm text-white/80">{event.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs font-semibold text-white/90">
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="h-4 w-4" />
                                    {event.when}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {event.where}
                                </span>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    )
}

