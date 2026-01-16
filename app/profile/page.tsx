import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getProfileAction } from '@/actions/profile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Availability } from '@/lib/types/profile'

export const dynamic = 'force-dynamic'

function getInitials(name: string) {
    return name
        .split(' ')
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

    const availabilityLabels = formatAvailability(profile.availability ?? null)

    return (
        <div className="min-h-screen bg-muted/40 px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <header className="flex flex-col items-center gap-4 text-center">
                    <Link href="/feed" className="inline-flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="OuterCircl"
                            width={140}
                            height={40}
                            className="h-10 w-auto"
                            priority
                        />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
                        <p className="text-sm text-muted-foreground">
                            Loaded from the backend API.
                        </p>
                    </div>
                </header>

                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14">
                                <AvatarImage src={profile.profile_picture_url ?? undefined} alt={profile.full_name} />
                                <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span>{formatDate(profile.date_of_birth)}</span>
                                    <span aria-hidden>•</span>
                                    <span className="capitalize">{profile.gender.replaceAll('_', ' ')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant={profile.is_verified ? 'default' : 'secondary'}>
                                {profile.is_verified ? 'Verified' : 'Member'}
                            </Badge>
                            <Badge variant="outline">{profile.distance_radius_km} km radius</Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {profile.bio ? (
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Bio</div>
                                <p className="text-sm text-muted-foreground">{profile.bio}</p>
                            </div>
                        ) : null}

                        <Separator />

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-3">
                                <div className="text-sm font-medium">Interests</div>
                                {profile.interests.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {profile.interests.map((interest) => (
                                            <Badge key={interest} variant="secondary">
                                                {interest}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No interests set.</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm font-medium">Hobbies</div>
                                {profile.hobbies.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {profile.hobbies.map((hobby) => (
                                            <Badge key={hobby} variant="secondary">
                                                {hobby}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No hobbies set.</p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="text-sm font-medium">Availability</div>
                            {availabilityLabels.length ? (
                                <div className="flex flex-wrap gap-2">
                                    {availabilityLabels.map((slot) => (
                                        <Badge key={slot} variant="outline">
                                            {slot}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Not specified.</p>
                            )}
                        </div>

                        <Separator />

                        <div className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
                            <div>
                                <div className="font-medium text-foreground">Created</div>
                                <div>{formatDate(profile.created_at)}</div>
                            </div>
                            <div>
                                <div className="font-medium text-foreground">Updated</div>
                                <div>{formatDate(profile.updated_at)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-center gap-3">
                    <Button asChild variant="outline">
                        <Link href="/feed">Back to feed</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/onboarding/profile">Edit via onboarding</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}


