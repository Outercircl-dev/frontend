/**
 * User authentication states representing the current step in auth flow
 * 
 * Architecture Principle:
 * - Backend decides what state user is in
 * - Frontend reads state from API
 * - State determines user's current flow step
 */
export enum UserAuthState {
  /**
   * User has valid session but email not yet verified
   * Redirect to: /auth/verify-email
   */
  NEEDS_EMAIL_VERIFICATION = 'needs-email-verification',

  /**
   * User has valid session and verified email but profile incomplete
   * Redirect to: /auth/complete-profile
   */
  NEEDS_PROFILE_COMPLETION = 'needs-profile',

  /**
   * User fully authenticated, verified, and has complete profile
   * Redirect to: /feed
   */
  ACTIVE = 'active',
}

/**
 * Type alias for UserAuthState or null (not authenticated)
 */
export type UserAuthStateType = UserAuthState | null;

