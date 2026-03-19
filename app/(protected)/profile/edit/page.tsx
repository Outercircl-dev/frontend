import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getInterestsAction, getProfileAction } from '@/actions/profile'
import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { EditProfileForm } from '@/components/profile/EditProfileForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mapUserProfileToForm } from '@/lib/profile/map-user-profile-to-form'

export const dynamic = 'force-dynamic'

export default async function EditProfilePage() {
  const [{ profile, error }, interestsResult] = await Promise.all([
    getProfileAction(),
    getInterestsAction(),
  ])

  if (error === 'Not authenticated') {
    redirect('/login')
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/40">
        <ProtectedHeader />
        <main className="mx-auto max-w-3xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Couldn&apos;t load edit profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{error}</p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/profile">Back to profile</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/feed">Go to feed</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!profile || !profile.profile_completed) {
    redirect('/onboarding/profile')
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />
      <main className="mx-auto max-w-4xl p-6">
        <EditProfileForm
          initialValues={mapUserProfileToForm(profile)}
          categories={interestsResult.categories}
        />
      </main>
    </div>
  )
}
