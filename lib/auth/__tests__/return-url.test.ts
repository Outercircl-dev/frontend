// Copyright (c) 2026 Outer Circle. All rights reserved.

import { UserAuthState } from '../../auth-state-machine';
import {
  RETURN_URL_COOKIE,
  appendReturnUrl,
  applyReturnUrlCookie,
  buildLoginPath,
  readReturnUrl,
  resolvePostAuthRedirect,
  resolveReturnOrDefault,
  sanitizeReturnUrl,
} from '../return-url';

describe('return-url', () => {
  describe('sanitizeReturnUrl', () => {
    it('accepts valid activity paths', () => {
      expect(sanitizeReturnUrl('/activities/id-123')).toBe('/activities/id-123');
      expect(sanitizeReturnUrl('/activities/id?tab=details')).toBe('/activities/id?tab=details');
    });

    it('rejects external and unsafe URLs', () => {
      expect(sanitizeReturnUrl('https://evil.com')).toBeNull();
      expect(sanitizeReturnUrl('//evil.com')).toBeNull();
      expect(sanitizeReturnUrl('/login')).toBeNull();
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeReturnUrl('')).toBeNull();
      expect(sanitizeReturnUrl(null)).toBeNull();
    });

    it('rejects paths outside the allowlist', () => {
      expect(sanitizeReturnUrl('/admin/secret')).toBeNull();
    });
  });

  describe('buildLoginPath', () => {
    it('encodes returnUrl for login', () => {
      expect(buildLoginPath('/activities/abc')).toBe('/login?returnUrl=%2Factivities%2Fabc');
    });

    it('returns bare login when return path is invalid', () => {
      expect(buildLoginPath('https://evil.com')).toBe('/login');
    });
  });

  describe('appendReturnUrl', () => {
    it('appends returnUrl to funnel paths', () => {
      expect(appendReturnUrl('/onboarding/profile', '/activities/x')).toBe(
        '/onboarding/profile?returnUrl=%2Factivities%2Fx',
      );
    });
  });

  describe('resolvePostAuthRedirect', () => {
    it('returns activity path for ACTIVE users with valid returnUrl', () => {
      expect(
        resolvePostAuthRedirect({
          authState: UserAuthState.ACTIVE,
          returnUrl: '/activities/abc',
        }),
      ).toBe('/activities/abc');
    });

    it('falls back to feed for ACTIVE users with invalid returnUrl', () => {
      expect(
        resolvePostAuthRedirect({
          authState: UserAuthState.ACTIVE,
          returnUrl: 'https://evil.com',
        }),
      ).toBe('/feed');
    });

    it('routes NEEDS_PROFILE through onboarding with returnUrl', () => {
      expect(
        resolvePostAuthRedirect({
          authState: UserAuthState.NEEDS_PROFILE_COMPLETION,
          returnUrl: '/activities/abc',
        }),
      ).toBe('/onboarding/profile?returnUrl=%2Factivities%2Fabc');
    });

    it('routes NEEDS_EMAIL_VERIFICATION with returnUrl', () => {
      expect(
        resolvePostAuthRedirect({
          authState: UserAuthState.NEEDS_EMAIL_VERIFICATION,
          returnUrl: '/activities/abc',
        }),
      ).toBe('/auth/verify-email?returnUrl=%2Factivities%2Fabc');
    });
  });

  describe('readReturnUrl', () => {
    it('prefers cookie over query because Supabase strips query params', () => {
      expect(
        readReturnUrl('/feed', '/activities/abc'),
      ).toBe('/activities/abc');
    });

    it('falls back to query when cookie is absent', () => {
      expect(readReturnUrl('/activities/abc', null)).toBe('/activities/abc');
    });
  });

  describe('applyReturnUrlCookie', () => {
    it('sets httpOnly cookie for valid return paths', () => {
      const set = jest.fn();
      const result = applyReturnUrlCookie({ set }, '/activities/abc');
      expect(result).toBe('/activities/abc');
      expect(set).toHaveBeenCalledWith(
        RETURN_URL_COOKIE,
        '/activities/abc',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
    });
  });

  describe('resolveReturnOrDefault', () => {
    it('uses sanitized returnUrl when valid', () => {
      expect(resolveReturnOrDefault('/activities/x', '/profile')).toBe('/activities/x');
    });

    it('uses fallback when invalid', () => {
      expect(resolveReturnOrDefault('https://evil.com', '/profile')).toBe('/profile');
    });
  });
});
