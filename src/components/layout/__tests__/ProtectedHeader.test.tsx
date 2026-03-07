/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'

import { ProtectedHeader } from '@/components/layout/ProtectedHeader'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img alt={props.alt} src={props.src} />,
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/settings'),
}))

describe('ProtectedHeader', () => {
  it('renders navigation and highlights current route', () => {
    render(<ProtectedHeader />)

    expect(screen.getByRole('link', { name: 'Discover' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'My activities' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/settings')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })
})
