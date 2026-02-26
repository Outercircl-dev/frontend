import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
    CalendarClock,
    CheckCircle2,
    Compass,
    Heart,
    ShieldCheck,
    Sparkles,
    UserCircle2,
    Users,
} from 'lucide-react'

import { getProfileAction } from '@/actions/profile'
import { ProfileNotificationsSection } from '@/components/notifications/ProfileNotificationsSection'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { Availability } from '@/lib/types/profile'
import type { UserProfile } from '@/lib/types/profile'

export const dynamic = 'force-dynamic'

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function formatDate(dateString: string) {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getAge(dateString: string) {
    const birthDate = new Date(dateString)
    if (Number.isNaN(birthDate.getTime())) return null

    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    const hasHadBirthday =
        monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthDate.getDate())

    if (!hasHadBirthday) age -= 1
    return age >= 0 ? age : null
}

function titleCase(value: string | null | undefined, fallback = 'Not specified') {
    if (!value) return fallback
    return value
        .replaceAll('_', ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function getAvailabilityCount(availability: Availability | null | undefined) {
    if (!availability) return 0
    return Object.values(availability).filter(Boolean).length
}

function getProfileStrength(profile: UserProfile) {
    const checks = [
        Boolean(profile.profile_picture_url),
        Boolean(profile.username),
        Boolean(profile.bio?.trim()),
        profile.interests.length > 0,
        profile.hobbies.length > 0,
        getAvailabilityCount(profile.availability) > 0,
    ]

    const completed = checks.filter(Boolean).length
    return Math.round((completed / checks.length) * 100)
}

function formatAvailability(availability: Availability | null | undefined) {
    if (!availability) return []
    const labels: Record<keyof Availability, string> = {
        weekday_morning: 'Weekday mornings',
        weekday_afternoon: 'Weekday afternoons',
        weekday_evening: 'Weekday evenings',
        weekend_anytime: 'Weekend anytime',
    }

    const keys = Object.keys(labels) as Array<keyof Availability>
    return keys.filter((key) => Boolean(availability[key])).map((key) => labels[key])
}

export default async function ProfilePage() {
    const { profile, error } = await getProfileAction()

    if (error === 'Not authenticated') {
        redirect('/login')
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-16">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Couldn&apos;t load your profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <p>{error}</p>
                        <div className="flex gap-3">
                            <Button asChild>
                                <Link href="/feed">Go to feed</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/onboarding/profile">Complete onboarding</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!profile || !profile.profile_completed) {
        redirect('/onboarding/profile')
    }

    const age = getAge(profile.date_of_birth)
    const availabilityLabels = formatAvailability(profile.availability ?? null)
    const availabilityCount = getAvailabilityCount(profile.availability ?? null)
    const profileStrength = getProfileStrength(profile)
    const memberSince = formatDate(profile.created_at)
    const lastUpdated = formatDate(profile.updated_at)
    const trustChecks = [
        { label: 'Identity verified', passed: profile.is_verified },
        { label: 'Terms accepted', passed: profile.accepted_tos },
        { label: 'Guidelines accepted', passed: profile.accepted_guidelines },
    ]
    const insightCards = [
        {
            title: 'Interests',
            value: profile.interests.length,
            subtitle: profile.interests.length === 1 ? 'Category selected' : 'Categories selected',
            icon: Sparkles,
        },
        {
            title: 'Hobbies',
            value: profile.hobbies.length,
            subtitle: profile.hobbies.length === 1 ? 'Hobby listed' : 'Hobbies listed',
            icon: Heart,
        },
        {
            title: 'Availability',
            value: availabilityCount,
            subtitle: availabilityCount === 1 ? 'Time slot active' : 'Time slots active',
            icon: CalendarClock,
        },
        {
            title: 'Discovery Radius',
            value: profile.distance_radius_km,
            subtitle: 'Kilometers around you',
            icon: Compass,
        },
    ]

    return (
        <div className="min-h-screen bg-muted/40">
            <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/feed" className="inline-flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="OuterCircl"
                            width={140}
                            height={40}
                            className="h-9 w-auto"
                            priority
                        />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="hidden sm:inline-flex">
                            <Link href="/feed">Discover</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/onboarding/profile">Edit profile</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <Card className="overflow-hidden border-muted/70 shadow-sm">
                    <CardContent className="p-0">
                        <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-6 py-6 sm:px-8">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                                        <AvatarImage
                                            src={profile.profile_picture_url ?? undefined}
                                            alt={profile.full_name}
                                        />
                                        <AvatarFallback className="text-lg">
                                            {getInitials(profile.full_name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="space-y-2">
                                        <div>
                                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                                {profile.full_name}
                                            </h1>
                                            <p className="text-sm text-muted-foreground">
                                                {profile.username ? `@${profile.username}` : 'Set a public username'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={profile.is_verified ? 'default' : 'secondary'}>
                                                {profile.is_verified ? 'Verified member' : 'Community member'}
                                            </Badge>
                                            {age !== null ? (
                                                <Badge variant="outline">{age} years old</Badge>
                                            ) : (
                                                <Badge variant="outline">Age not available</Badge>
                                            )}
                                            <Badge variant="outline">{titleCase(profile.gender)}</Badge>
                                            <Badge variant="outline">{profile.distance_radius_km} km radius</Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-64 space-y-3 rounded-xl border bg-background/90 p-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Profile strength</span>
                                        <span className="font-medium">{profileStrength}%</span>
                                    </div>
                                    <Progress value={profileStrength} />
                                    <p className="text-xs text-muted-foreground">
                                        Complete your details to improve discovery quality and matching.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button asChild size="sm" className="w-full">
                                            <Link href="/onboarding/profile">Update details</Link>
                                        </Button>
                                        <Button asChild size="sm" variant="outline" className="w-full">
                                            <Link href="/feed">Back to feed</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {insightCards.map((card) => {
                        const Icon = card.icon
                        return (
                            <Card key={card.title} className="border-muted/70">
                                <CardContent className="flex items-start justify-between gap-3 p-5">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            {card.title}
                                        </p>
                                        <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                                        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 p-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </section>

                <section className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <Card className="border-muted/70">
                            <CardHeader>
                                <CardTitle className="text-lg">About</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {profile.bio?.trim() ? (
                                    <p className="text-sm leading-7 text-muted-foreground">{profile.bio}</p>
                                ) : (
                                    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                                        Add a short bio so people can better understand your vibe and interests.
                                    </div>
                                )}
                                <Separator />
                                <div className="grid gap-4 text-sm sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <div className="text-muted-foreground">Username</div>
                                        <div className="font-medium">
                                            {profile.username ? `@${profile.username}` : 'Not set'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-muted-foreground">Date of birth</div>
                                        <div className="font-medium">{formatDate(profile.date_of_birth)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-muted-foreground">Member since</div>
                                        <div className="font-medium">{memberSince}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-muted/70">
                            <CardHeader>
                                <CardTitle className="text-lg">Interests and hobbies</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                                        Interests
                                    </div>
                                    {profile.interests.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {profile.interests.map((interest) => (
                                                <Badge key={interest} variant="secondary">
                                                    {titleCase(interest, interest)}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No interests yet. Add at least three to improve recommendations.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Heart className="h-4 w-4 text-muted-foreground" />
                                        Hobbies
                                    </div>
                                    {profile.hobbies.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {profile.hobbies.map((hobby) => (
                                                <Badge key={hobby} variant="secondary">
                                                    {titleCase(hobby, hobby)}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            Add hobbies to give others a clearer first impression.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-muted/70">
                            <CardHeader>
                                <CardTitle className="text-lg">Availability and preferences</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {availabilityLabels.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {availabilityLabels.map((slot) => (
                                            <Badge key={slot} variant="outline" className="bg-background">
                                                {slot}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                                        No availability set yet. Add your preferred times to get better activity matches.
                                    </div>
                                )}
                                <Separator />
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">Current discovery radius</span>
                                    <span className="font-medium">{profile.distance_radius_km} km</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="border-muted/70">
                            <CardHeader>
                                <CardTitle className="text-lg">Trust and account</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    {trustChecks.map((check) => (
                                        <div
                                            key={check.label}
                                            className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                                        >
                                            <span className="text-sm">{check.label}</span>
                                            {check.passed ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="grid gap-3 text-sm">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-muted-foreground">Profile status</span>
                                        <Badge variant="secondary">
                                            {profile.profile_completed ? 'Completed' : 'In progress'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-muted-foreground">Last updated</span>
                                        <span className="font-medium">{lastUpdated}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-muted/70">
                            <CardHeader>
                                <CardTitle className="text-base">Quick actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/onboarding/profile">
                                        <UserCircle2 className="mr-2 h-4 w-4" />
                                        Edit profile details
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/pricing">
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Explore premium
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/activities">
                                        <Compass className="mr-2 h-4 w-4" />
                                        My activities
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <ProfileNotificationsSection />
                    </div>
                </section>
            </main>
        </div>
    )
}


