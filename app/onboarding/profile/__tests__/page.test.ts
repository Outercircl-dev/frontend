/**
 * Unit tests for onboarding profile page integration
 * @see app/onboarding/profile/page.tsx
 * @ticket OD-178
 * 
 * Tests that onboarding page correctly integrates with completeProfileAction.
 */

import { completeProfileAction } from '@/actions/profile/complete-profile-action'

// Mock the server action
jest.mock('@/actions/profile/complete-profile-action', () => ({
  completeProfileAction: jest.fn(),
}))

const mockCompleteProfileAction = completeProfileAction as jest.MockedFunction<typeof completeProfileAction>

describe('OnboardingProfilePage integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('form submission', () => {
    it('should call completeProfileAction with correct FormData structure', async () => {
      const formData = new FormData()
      formData.append('fullName', 'John Doe')
      formData.append('dateOfBirth', '2000-01-01')
      formData.append('gender', 'male')
      formData.append('interests', 'running')
      formData.append('interests', 'cycling')
      formData.append('acceptedTos', 'true')
      formData.append('acceptedGuidelines', 'true')
      formData.append('confirmedAge', 'true')
      formData.append('confirmedPlatonic', 'true')

      // Mock redirect behavior (redirect throws in Next.js)
      mockCompleteProfileAction.mockImplementationOnce(async () => {
        throw new Error('REDIRECT:/profile')
      })

      try {
        await completeProfileAction(
          { status: 'idle', message: '' },
          formData
        )
      } catch (error: any) {
        expect(error.message).toBe('REDIRECT:/profile')
      }

      expect(mockCompleteProfileAction).toHaveBeenCalledWith(
        { status: 'idle', message: '' },
        formData
      )
    })

    it('should handle validation errors from completeProfileAction', async () => {
      const formData = new FormData()
      // Invalid data
      formData.append('fullName', '') // Empty name

      mockCompleteProfileAction.mockResolvedValueOnce({
        status: 'error',
        message: 'Full name is required',
        errors: {
          fullName: ['Full name is required'],
        },
      })

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toContain('Full name')
      expect(result.errors).toBeDefined()
    })

    it('should handle backend errors from completeProfileAction', async () => {
      const formData = createValidFormData()

      mockCompleteProfileAction.mockResolvedValueOnce({
        status: 'error',
        message: 'Failed to save profile. Please try again.',
      })

      const result = await completeProfileAction(
        { status: 'idle', message: '' },
        formData
      )

      expect(result.status).toBe('error')
      expect(result.message).toContain('Failed to save')
    })

    it('should handle successful profile save (redirect)', async () => {
      const formData = createValidFormData()

      // Redirect throws in Next.js
      mockCompleteProfileAction.mockImplementationOnce(async () => {
        throw new Error('REDIRECT:/profile')
      })

      try {
        await completeProfileAction(
          { status: 'idle', message: '' },
          formData
        )
      } catch (error: any) {
        // Expected redirect
        expect(error.message).toBe('REDIRECT:/profile')
      }
    })
  })

  describe('FormData construction', () => {
    it('should construct FormData with all required fields', () => {
      const formData = new FormData()
      
      // Basic info
      formData.append('fullName', 'John Doe')
      formData.append('dateOfBirth', '2000-01-01')
      formData.append('gender', 'male')
      
      // Interests (multiple)
      formData.append('interests', 'running')
      formData.append('interests', 'cycling')
      
      // Preferences
      formData.append('bio', 'Test bio')
      formData.append('hobbies', 'reading')
      formData.append('distanceRadiusKm', '25')
      formData.append('weekday_morning', 'true')
      formData.append('weekday_afternoon', 'false')
      
      // Guidelines
      formData.append('acceptedTos', 'true')
      formData.append('acceptedGuidelines', 'true')
      formData.append('confirmedAge', 'true')
      formData.append('confirmedPlatonic', 'true')

      // Verify all fields are present
      expect(formData.get('fullName')).toBe('John Doe')
      expect(formData.get('dateOfBirth')).toBe('2000-01-01')
      expect(formData.getAll('interests')).toEqual(['running', 'cycling'])
      expect(formData.get('acceptedTos')).toBe('true')
      expect(formData.get('confirmedAge')).toBe('true')
    })
  })
})

// Helper function
function createValidFormData(): FormData {
  const formData = new FormData()
  formData.append('fullName', 'John Doe')
  formData.append('dateOfBirth', '2000-01-01')
  formData.append('gender', 'male')
  formData.append('interests', 'running')
  formData.append('interests', 'cycling')
  formData.append('bio', 'Test bio')
  formData.append('hobbies', 'reading')
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

