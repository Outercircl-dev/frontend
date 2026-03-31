'use client'

import { Fragment } from 'react'

function parseNotificationBody(body: string): Array<{ text: string; emphasized: boolean }> {
  const pattern = /\*\*(.+?)\*\*/g
  const parts: Array<{ text: string; emphasized: boolean }> = []
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(body)) !== null) {
    const [fullMatch, emphasized] = match
    const index = match.index
    if (index > cursor) {
      parts.push({ text: body.slice(cursor, index), emphasized: false })
    }
    parts.push({ text: emphasized, emphasized: true })
    cursor = index + fullMatch.length
  }
  if (cursor < body.length) {
    parts.push({ text: body.slice(cursor), emphasized: false })
  }
  return parts.length > 0 ? parts : [{ text: body, emphasized: false }]
}

export function NotificationBodyText({ body, className }: { body: string; className?: string }) {
  const parts = parseNotificationBody(body)
  return (
    <p className={className}>
      {parts.map((part, index) => (
        <Fragment key={`${part.text}-${index}`}>
          {part.emphasized ? <strong>{part.text}</strong> : part.text}
        </Fragment>
      ))}
    </p>
  )
}

