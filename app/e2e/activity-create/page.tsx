import { notFound } from 'next/navigation'

import CreateActivityPage from '@/app/(protected)/activities/new/page'

export default function ActivityCreateE2EPage() {
  if (process.env.ENABLE_E2E_PAGES !== 'true') {
    notFound()
  }

  return <CreateActivityPage />
}
