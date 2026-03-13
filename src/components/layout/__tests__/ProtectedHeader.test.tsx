/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'

import { ProtectedHeader } from '@/components/layout/ProtectedHeader'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => <span>{props.alt}</span>,
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/settings'),
}))

jest.mock('@/hooks/useAuthState', () => ({
  useAuthState: jest.fn(() => ({
    user: {
      email: 'test.user@example.com',
      displayName: 'Test User',
      avatarUrl: null,
    },
  })),
}))

describe('ProtectedHeader', () => {
  it('renders mobile-first actions and account trigger', () => {
    render(<ProtectedHeader />)

    expect(screen.getByRole('link', { name: 'Create activity' }).getAttribute('href')).toBe('/activities/new')
    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'OuterCircl' }).getAttribute('href')).toBe('/feed')
  })
})
