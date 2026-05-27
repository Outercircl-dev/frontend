// Copyright (c) 2026 Outer Circle. All rights reserved.

import { UserAuthState, type UserAuthStateType } from '../auth-state-machine';

export const RETURN_URL_COOKIE = 'oc_return_url';
export const RETURN_URL_PARAM = 'returnUrl';
export const RETURN_URL_COOKIE_MAX_AGE = 3600;

const ALLOWED_RETURN_PREFIXES = [
  '/activities',
  '/feed',
  '/settings',
  '/profile',
  '/onboarding',
  '/host',
  '/pricing',
] as const;

const BLOCKED_PATHS = ['/login', '/auth/confirm'];

function hasDisallowedScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Accept only same-app relative paths safe for post-auth redirects.
 */
export function sanitizeReturnUrl(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  if (hasDisallowedScheme(trimmed) || trimmed.includes('\\')) {
    return null;
  }

  const pathOnly = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
  if (BLOCKED_PATHS.some((blocked) => pathOnly === blocked || pathOnly.startsWith(`${blocked}/`))) {
    return null;
  }

  if (!isAllowedReturnPath(trimmed)) {
    return null;
  }

  return trimmed;
}

export function isAllowedReturnPath(path: string): boolean {
  const pathOnly = path.split('?')[0]?.split('#')[0] ?? path;
  return ALLOWED_RETURN_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
}

export function buildLoginPath(returnPath: string): string {
  const sanitized = sanitizeReturnUrl(returnPath);
  if (!sanitized) {
    return '/login';
  }
  return `/login?${RETURN_URL_PARAM}=${encodeURIComponent(sanitized)}`;
}

export function buildLoginUrl(origin: string, returnPath: string): string {
  const path = buildLoginPath(returnPath);
  return new URL(path, origin.replace(/\/$/, '')).toString();
}

export function appendReturnUrl(basePath: string, returnUrl: string | null | undefined): string {
  const sanitized = sanitizeReturnUrl(returnUrl);
  if (!sanitized) {
    return basePath;
  }
  const url = new URL(basePath, 'http://localhost');
  url.searchParams.set(RETURN_URL_PARAM, sanitized);
  return `${url.pathname}${url.search}`;
}

export function resolveReturnOrDefault(
  returnUrl: string | null | undefined,
  fallback: string,
): string {
  return sanitizeReturnUrl(returnUrl) ?? fallback;
}

export function resolvePostAuthRedirect({
  authState,
  returnUrl,
}: {
  authState: UserAuthStateType;
  returnUrl: string | null | undefined;
}): string {
  const sanitized = sanitizeReturnUrl(returnUrl);

  if (authState === UserAuthState.ACTIVE) {
    return sanitized ?? '/feed';
  }

  if (authState === UserAuthState.NEEDS_EMAIL_VERIFICATION) {
    return appendReturnUrl('/auth/verify-email', sanitized);
  }

  if (authState === UserAuthState.NEEDS_PROFILE_COMPLETION) {
    return appendReturnUrl('/onboarding/profile', sanitized);
  }

  return sanitized ? buildLoginPath(sanitized) : '/login';
}

export function getReturnUrlCookieOptions(): {
  httpOnly: true;
  sameSite: 'lax';
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: RETURN_URL_COOKIE_MAX_AGE,
    path: '/',
  };
}

/**
 * Read post-auth destination. Prefer the httpOnly cookie because Supabase
 * magic links only redirect to allowlisted paths (e.g. /auth/confirm) and strip
 * custom query parameters from emailRedirectTo.
 */
export function readReturnUrl(
  queryValue: string | null | undefined,
  cookieValue: string | null | undefined,
): string | null {
  return sanitizeReturnUrl(cookieValue) ?? sanitizeReturnUrl(queryValue);
}

type CookieSetter = {
  set: (name: string, value: string, options: ReturnType<typeof getReturnUrlCookieOptions>) => void;
};

export function applyReturnUrlCookie(
  cookieStore: CookieSetter,
  returnUrl: string | null | undefined,
): string | null {
  const sanitized = sanitizeReturnUrl(returnUrl);
  if (sanitized) {
    cookieStore.set(RETURN_URL_COOKIE, sanitized, getReturnUrlCookieOptions());
  }
  return sanitized;
}
