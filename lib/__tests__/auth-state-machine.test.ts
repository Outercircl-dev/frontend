/**
 * Unit tests for auth-state-machine
 * @see lib/auth-state-machine.ts
 * @ticket OD-79
 * 
 * Tests the backend-driven authentication state machine logic:
 * - getUserAuthState: determines user state based on email/profile status
 * - getRedirectUrlForState: maps state to redirect URL
 */

import { 
  UserAuthState, 
  getUserAuthState, 
  getRedirectUrlForState,
  UserAuthStateType 
} from '../auth-state-machine';

describe('auth-state-machine', () => {
  describe('UserAuthState enum', () => {
    it('should have correct state values', () => {
      expect(UserAuthState.NEEDS_EMAIL_VERIFICATION).toBe('needs-email-verification');
      expect(UserAuthState.NEEDS_PROFILE_COMPLETION).toBe('needs-profile');
      expect(UserAuthState.ACTIVE).toBe('active');
    });
  });

  describe('getUserAuthState', () => {
    describe('email not verified', () => {
      it('should return NEEDS_EMAIL_VERIFICATION when email not verified (profile incomplete)', () => {
        const state = getUserAuthState(false, false);
        expect(state).toBe(UserAuthState.NEEDS_EMAIL_VERIFICATION);
      });

      it('should return NEEDS_EMAIL_VERIFICATION when email not verified (profile complete)', () => {
        // Even if profile is complete, email verification takes priority
        const state = getUserAuthState(false, true);
        expect(state).toBe(UserAuthState.NEEDS_EMAIL_VERIFICATION);
      });
    });

    describe('email verified, profile incomplete', () => {
      it('should return NEEDS_PROFILE_COMPLETION when email verified but profile incomplete', () => {
        const state = getUserAuthState(true, false);
        expect(state).toBe(UserAuthState.NEEDS_PROFILE_COMPLETION);
      });
    });

    describe('fully onboarded', () => {
      it('should return ACTIVE when both email verified and profile complete', () => {
        const state = getUserAuthState(true, true);
        expect(state).toBe(UserAuthState.ACTIVE);
      });
    });
  });

  describe('getRedirectUrlForState', () => {
    it('should return /auth/verify-email for NEEDS_EMAIL_VERIFICATION', () => {
      const url = getRedirectUrlForState(UserAuthState.NEEDS_EMAIL_VERIFICATION);
      expect(url).toBe('/auth/verify-email');
    });

    it('should return /onboarding/profile for NEEDS_PROFILE_COMPLETION', () => {
      const url = getRedirectUrlForState(UserAuthState.NEEDS_PROFILE_COMPLETION);
      expect(url).toBe('/onboarding/profile');
    });

    it('should return /feed for ACTIVE state', () => {
      const url = getRedirectUrlForState(UserAuthState.ACTIVE);
      expect(url).toBe('/feed');
    });

    it('should return /login for null state (unauthenticated)', () => {
      const url = getRedirectUrlForState(null);
      expect(url).toBe('/login');
    });

    it('should return /login for undefined state', () => {
      const url = getRedirectUrlForState(undefined as unknown as UserAuthStateType);
      expect(url).toBe('/login');
    });
  });

  describe('integration: state flow', () => {
    it('should guide user through complete auth flow', () => {
      // Step 1: New user, email not verified
      let state = getUserAuthState(false, false);
      let url = getRedirectUrlForState(state);
      expect(state).toBe(UserAuthState.NEEDS_EMAIL_VERIFICATION);
      expect(url).toBe('/auth/verify-email');

      // Step 2: User verifies email, but profile incomplete
      state = getUserAuthState(true, false);
      url = getRedirectUrlForState(state);
      expect(state).toBe(UserAuthState.NEEDS_PROFILE_COMPLETION);
      expect(url).toBe('/onboarding/profile');

      // Step 3: User completes profile
      state = getUserAuthState(true, true);
      url = getRedirectUrlForState(state);
      expect(state).toBe(UserAuthState.ACTIVE);
      expect(url).toBe('/feed');
    });

    it('should handle returning user (already onboarded)', () => {
      const state = getUserAuthState(true, true);
      const url = getRedirectUrlForState(state);
      expect(state).toBe(UserAuthState.ACTIVE);
      expect(url).toBe('/feed');
    });
  });
});

