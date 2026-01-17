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
   * Redirect to: /onboarding/profile
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

/**
 * Determine the authentication state of a user
 *
 * Business logic:
 * 1. If email not verified → user can't proceed → NEEDS_EMAIL_VERIFICATION
 * 2. If email verified but profile incomplete → user can't use app → NEEDS_PROFILE_COMPLETION
 * 3. If both complete → user is ready → ACTIVE
 *
 * @param emailVerified - Whether user's email is verified
 * @param profileCompleted - Whether user has completed profile
 * @returns Current authentication state
 */
export function getUserAuthState(
  emailVerified: boolean,
  profileCompleted: boolean
): UserAuthState {
  if (!emailVerified) {
    return UserAuthState.NEEDS_EMAIL_VERIFICATION;
  }

  if (!profileCompleted) {
    return UserAuthState.NEEDS_PROFILE_COMPLETION;
  }

  return UserAuthState.ACTIVE;
}

/**
 * Get redirect URL based on authentication state
 *
 * Used by frontend to know where to navigate user
 *
 * @param state - Current authentication state
 * @returns URL to redirect user to
 */
export function getRedirectUrlForState(state: UserAuthStateType): string | null {
  switch (state) {
    case UserAuthState.NEEDS_EMAIL_VERIFICATION:
      return '/auth/verify-email';
    case UserAuthState.NEEDS_PROFILE_COMPLETION:
      return '/onboarding/profile';
    case UserAuthState.ACTIVE:
      return '/feed';
    default:
      return '/login';
  }
}

