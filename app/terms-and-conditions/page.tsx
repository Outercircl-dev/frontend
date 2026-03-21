import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { readLegalDoc } from '@/lib/legal/read-legal-doc'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Outercircl terms of service and legal conditions.',
}

export default async function TermsAndConditionsPage() {
  const { title, content, lastUpdated } = await readLegalDoc({
    filename: 'outercircl_ToS_03.18.26.docx.txt',
    fallbackTitle: 'Terms of Service',
  })

  return (
    <LegalDocumentPage heading="Outercircl Legal" title={title} lastUpdated={lastUpdated} content={content} />
  )
}
