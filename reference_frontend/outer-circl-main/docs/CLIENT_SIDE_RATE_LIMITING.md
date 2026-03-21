# Client-Side Rate Limiting Documentation

## Purpose

The `useAuthRateLimit` hook in `src/hooks/useAuthRateLimit.ts` is **NOT a security feature**. It is a **UX improvement** that prevents legitimate users from accidentally making too many rapid authentication attempts.

## Architecture

### Client-Side (UX Layer)
- **File**: `src/hooks/useAuthRateLimit.ts`
- **Storage**: `localStorage` 
- **Limits**: 5 attempts per 15 minutes
- **Purpose**: Provide instant feedback to users and prevent accidental rapid retries
- **Security Level**: ⚠️ **ZERO** - Can be bypassed by clearing localStorage

### Server-Side (Security Layer)
- **Edge Function**: `supabase/functions/auth-rate-limit/index.ts`
- **Database Function**: `check_rate_limit_sensitive()` in Supabase
- **Storage**: Database table `rate_limits`
- **Limits**: 50 requests per hour (configurable per endpoint)
- **Purpose**: **Actual security protection** against brute force attacks
- **Security Level**: ✅ **HIGH** - Cannot be bypassed by client

## How It Works Together

```
User Login Attempt
       ↓
┌──────────────────────┐
│ Client-Side Check    │ ← Fast feedback, UX improvement
│ (localStorage)       │   (can be bypassed)
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Server-Side Check    │ ← Real security enforcement
│ (Database)           │   (cannot be bypassed)
└──────────┬───────────┘
           ↓
    Allow/Deny Request
```

## Why Not Remove Client-Side?

1. **Instant Feedback**: Users get immediate feedback without network round-trip
2. **Reduced Server Load**: Prevents unnecessary API calls for obvious rate limit violations
3. **Better UX**: Shows remaining attempts and time until reset
4. **No False Security**: Documented clearly that this is NOT a security control

## Security Best Practices

✅ **DO**:
- Use client-side rate limiting for UX improvements
- Always enforce rate limits on the server
- Document which layer provides actual security

❌ **DON'T**:
- Rely on client-side rate limiting for security
- Hide the existence of server-side enforcement
- Assume client-side validation is sufficient

## Testing

To verify security is working:

1. **Bypass Client-Side**: Open DevTools, run `localStorage.removeItem('auth_rate_limit')`
2. **Attempt Multiple Logins**: Try 50+ login attempts rapidly
3. **Expected Result**: Server-side rate limiting blocks you after 50 attempts/hour

## Related Files

- `src/hooks/useAuthRateLimit.ts` - Client-side UX layer
- `supabase/functions/auth-rate-limit/index.ts` - Server-side security layer
- Database table: `rate_limits` - Persistent rate limit tracking
- Database function: `check_rate_limit_sensitive()` - Rate limit enforcement logic
