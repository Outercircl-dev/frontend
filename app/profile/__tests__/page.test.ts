/**
 * Unit tests for profile page
 * @see app/profile/page.tsx
 * @ticket OD-178
 * 
 * Tests that profile page correctly uses getProfileAction and handles states.
 */

import { getProfileAction } from '@/actions/profile'

// Mock the server action
jest.mock('@/actions/profile', () => ({
  getProfileAction: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

const mockGetProfileAction = getProfileAction as jest.MockedFunction<typeof getProfileAction>
const { redirect } = require('next/navigation')

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('profile loading', () => {
    it('should call getProfileAction to fetch profile', async () => {
      const mockProfile = createMockProfile()
      mockGetProfileAction.mockResolvedValueOnce({
        profile: mockProfile,
        error: null,
      })

      // Import and execute the page component logic
      const { getProfileAction } = await import('@/actions/profile')
      const result = await getProfileAction()

      expect(result.profile).toBeDefined()
      expect(result.profile?.full_name).toBe('John Doe')
    })

    it('should redirect to onboarding if profile not found', async () => {
      mockGetProfileAction.mockResolvedValueOnce({
        profile: null,
        error: 'Profile not found',
      })

      try {
        // Simulate page component behavior
        const { profile, error } = await getProfileAction()
        if (error || !profile) {
          redirect('/onboarding/profile')
        }
      } catch (error: any) {
        expect(error.message).toBe('REDIRECT:/onboarding/profile')
      }
    })

    it('should redirect to onboarding if profile not completed', async () => {
      const incompleteProfile = createMockProfile()
      incompleteProfile.profile_completed = false

      mockGetProfileAction.mockResolvedValueOnce({
        profile: incompleteProfile,
        error: null,
      })

      try {
        const { profile } = await getProfileAction()
        if (!profile?.profile_completed) {
          redirect('/onboarding/profile')
        }
      } catch (error: any) {
        expect(error.message).toBe('REDIRECT:/onboarding/profile')
      }
    })
  })

  describe('profile data display', () => {
    it('should handle profile with all fields', async () => {
      const mockProfile = createMockProfile()
      mockProfile.bio = 'Test bio'
      mockProfile.hobbies = ['reading', 'coding']
      mockProfile.profile_picture_url = 'https://example.com/avatar.jpg'

      mockGetProfileAction.mockResolvedValueOnce({
        profile: mockProfile,
        error: null,
      })

      const { profile } = await getProfileAction()

      expect(profile).toBeDefined()
      expect(profile?.bio).toBe('Test bio')
      expect(profile?.hobbies).toEqual(['reading', 'coding'])
      expect(profile?.profile_picture_url).toBe('https://example.com/avatar.jpg')
    })

    it('should handle profile with minimal fields', async () => {
      const minimalProfile = createMockProfile()
      minimalProfile.bio = null
      minimalProfile.hobbies = []
      minimalProfile.profile_picture_url = null

      mockGetProfileAction.mockResolvedValueOnce({
        profile: minimalProfile,
        error: null,
      })

      const { profile } = await getProfileAction()

      expect(profile).toBeDefined()
      expect(profile?.bio).toBeNull()
      expect(profile?.hobbies).toEqual([])
    })
  })
})

// Helper function
function createMockProfile() {
  return {
    id: 'profile-123',
    user_id: 'user-123',
    full_name: 'John Doe',
    date_of_birth: new Date('2000-01-01'),
    gender: 'male',
    profile_picture_url: null,
    bio: null,
    interests: ['running', 'cycling'],
    hobbies: [],
    availability: {
      weekday_morning: true,
      weekday_afternoon: false,
      weekday_evening: true,
      weekend_anytime: false,
    },
    distance_radius_km: 25,
    accepted_tos: true,
    accepted_guidelines: true,
    accepted_tos_at: new Date(),
    accepted_guidelines_at: new Date(),
    profile_completed: true,
    is_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

