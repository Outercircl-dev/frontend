import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { readLegalDoc } from '@/lib/legal/read-legal-doc'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Outercircl privacy policy and data protection information.',
}

export default async function PrivacyPolicyPage() {
  const { title, content, lastUpdated } = await readLegalDoc({
    filename: 'Outercircl_Privacy_Policy_v3.docx.txt',
    fallbackTitle: 'Privacy Policy',
  })

  return (
    <LegalDocumentPage heading="Outercircl Legal" title={title} lastUpdated={lastUpdated} content={content} />
  )
}
