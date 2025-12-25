/**
 * Unit tests for complete-profile-action
 * @see actions/profile/complete-profile-action.ts
 * @ticket OD-178
 * 
 * Tests the server action that saves profile data and redirects to profile page.
 */

import { completeProfileAction } from '../complete-profile-action'
import type { ProfileFormState } from '@/lib/types/profile'

// Mock dependencies
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
    },
  })),
}))

jest.mock('@/lib/utils/api-url', () => ({
  buildApiUrl: jest.fn((baseUrl: string, endpoint: string) => `${baseUrl}/api/${endpoint}`),
}))

const mockRevalidatePath = require('next/cache').revalidatePath
const mockRedirect = require('next/navigation').redirect
const { createClient } = require('@/lib/supabase/server')

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock environment variable - must be set before module loads
// Note: This is set in beforeAll, but module may cache it
// For tests that need API_URL, we'll ensure it's set in beforeEach

describe('completeProfileAction', () => {
  beforeEach(() => {
    // Ensure API_URL is set for each test
    process.env.API_URL = 'http://localhost:4000'
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockRevalidatePath.mockClear()
    mockRedirect.mockClear()
  })

  describe('validation', () => {
    it('should return error if required fields are missing', async () => {
      const formData = new FormData()
      // Missing required fields

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toBeTruthy()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return error if validation fails', async () => {
      const formData = new FormData()
      formData.append('fullName', '') // Empty name should fail validation
      formData.append('dateOfBirth', '2000-01-01')
      formData.append('gender', 'male')
      formData.append('interests', 'running')
      formData.append('acceptedTos', 'true')
      formData.append('acceptedGuidelines', 'true')
      formData.append('confirmedAge', 'true')
      formData.append('confirmedPlatonic', 'true')

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.errors).toBeDefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('authentication', () => {
    it('should return error if no access token', async () => {
      const formData = createValidFormData()
      
      createClient.mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
          }),
        },
      })

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toContain('logged in')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('API_URL configuration', () => {
    it('should return error if API_URL is not configured', async () => {
      // Mock the module to return undefined for API_URL
      jest.resetModules()
      process.env.API_URL = ''
      
      // Re-import to get fresh module with empty API_URL
      const { completeProfileAction: testAction } = await import('../complete-profile-action')
      
      const formData = createValidFormData()
      mockSessionWithToken()

      const result = await testAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toContain('Backend URL not configured')
      expect(mockFetch).not.toHaveBeenCalled()
      
      // Restore
      process.env.API_URL = 'http://localhost:4000'
      jest.resetModules()
    })
  })

  describe('backend API call', () => {
    beforeEach(() => {
      process.env.API_URL = 'http://localhost:4000' // Ensure API_URL is set
      mockSessionWithToken()
    })

    it('should call backend API with correct data structure', async () => {
      const formData = createValidFormData()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      })

      try {
        await completeProfileAction(
          { status: 'idle', message: '' },
          formData
        )
      } catch (error: any) {
        // Expect redirect to be called
        expect(error.message).toContain('REDIRECT:/profile')
      }

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('/api/profile')
      expect(callArgs[1].method).toBe('POST')
      expect(callArgs[1].headers.Authorization).toContain('Bearer')
      expect(callArgs[1].headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(callArgs[1].body)
      expect(body.fullName).toBe('John Doe')
      expect(body.dateOfBirth).toBe('2000-01-01')
      expect(body.acceptedTos).toBe(true)
      expect(body.acceptedGuidelines).toBe(true)
    })

    it('should handle backend error response', async () => {
      const formData = createValidFormData()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      })

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toContain('Failed to save profile')
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      const formData = createValidFormData()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toContain('Failed to save profile')
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('redirect behavior', () => {
    beforeEach(() => {
      process.env.API_URL = 'http://localhost:4000' // Ensure API_URL is set
      mockSessionWithToken()
    })

    it('should redirect to /profile on successful save (OD-178)', async () => {
      const formData = createValidFormData()
      
      // Mock successful backend response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      })

      // The action should redirect to /profile (not /feed)
      try {
        await completeProfileAction(
          { status: 'idle', message: '' },
          formData
        )
        // If we reach here, redirect wasn't called (unexpected)
        fail('Expected redirect to /profile')
      } catch (error: any) {
        // Verify redirect path is /profile (OD-178 requirement)
        expect(error.message).toBe('REDIRECT:/profile')
      }

      // Verify revalidatePath is called with /profile
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile')
      // Verify redirect is called with /profile (not /feed)
      expect(mockRedirect).toHaveBeenCalledWith('/profile')
    })
  })

  describe('data transformation', () => {
    beforeEach(() => {
      process.env.API_URL = 'http://localhost:4000' // Ensure API_URL is set
      mockSessionWithToken()
    })

    it('should transform form data to backend format correctly', async () => {
      const formData = createValidFormData()
      formData.append('profilePictureUrl', 'https://example.com/avatar.jpg')
      formData.append('bio', 'Test bio')
      formData.append('hobbies', 'reading')
      formData.append('hobbies', 'coding')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      })

      try {
        await completeProfileAction(
          { status: 'idle', message: '' },
          formData
        )
      } catch (error) {
        // Expected redirect
      }

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      // Check snake_case conversion
      expect(body.full_name).toBe('John Doe')
      expect(body.date_of_birth).toBe('2000-01-01')
      expect(body.profile_picture_url).toBe('https://example.com/avatar.jpg')
      expect(body.distance_radius_km).toBe(25)
      expect(body.interests).toEqual(['running', 'cycling'])
      expect(body.hobbies).toEqual(['reading', 'coding'])
      expect(body.availability).toEqual({
        weekday_morning: true,
        weekday_afternoon: false,
        weekday_evening: true,
        weekend_anytime: false,
      })
    })
  })
})

// Helper functions
function createValidFormData(): FormData {
  const formData = new FormData()
  formData.append('fullName', 'John Doe')
  formData.append('dateOfBirth', '2000-01-01')
  formData.append('gender', 'male')
  formData.append('interests', 'running')
  formData.append('interests', 'cycling')
  formData.append('interests', 'swimming') // Need at least 3 interests
  formData.append('bio', '')
  formData.append('distanceRadiusKm', '25')
  formData.append('weekday_morning', 'true')
  formData.append('weekday_afternoon', 'false')
  formData.append('weekday_evening', 'true')
  formData.append('weekend_anytime', 'false')
  formData.append('acceptedTos', 'true')
  formData.append('acceptedGuidelines', 'true')
  formData.append('confirmedAge', 'true')
  formData.append('confirmedPlatonic', 'true')
  return formData
}

function mockSessionWithToken() {
  createClient.mockReturnValue({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
          },
        },
      }),
    },
  })
}

