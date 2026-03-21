import { useState, useCallback } from 'react';

interface RateLimitAttempt {
  timestamp: number;
  count: number;
}

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const STORAGE_KEY = 'auth_rate_limit';

/**
 * Client-side rate limiting for authentication attempts
 * Prevents brute force attacks by limiting login/signup attempts
 */
export const useAuthRateLimit = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS);

  const getRateLimitData = useCallback((): RateLimitAttempt => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return { timestamp: Date.now(), count: 0 };
      return JSON.parse(data);
    } catch {
      return { timestamp: Date.now(), count: 0 };
    }
  }, []);

  const setRateLimitData = useCallback((data: RateLimitAttempt) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limit data:', error);
    }
  }, []);

  const checkRateLimit = useCallback((): boolean => {
    const data = getRateLimitData();
    const now = Date.now();

    // Reset if window has passed
    if (now - data.timestamp > RATE_LIMIT_WINDOW) {
      setRateLimitData({ timestamp: now, count: 0 });
      setIsRateLimited(false);
      setRemainingAttempts(MAX_ATTEMPTS);
      return true;
    }

    // Check if rate limited
    if (data.count >= MAX_ATTEMPTS) {
      setIsRateLimited(true);
      setRemainingAttempts(0);
      return false;
    }

    setRemainingAttempts(MAX_ATTEMPTS - data.count);
    setIsRateLimited(false);
    return true;
  }, [getRateLimitData, setRateLimitData]);

  const recordAttempt = useCallback(() => {
    const data = getRateLimitData();
    const now = Date.now();

    // Reset if window has passed
    if (now - data.timestamp > RATE_LIMIT_WINDOW) {
      setRateLimitData({ timestamp: now, count: 1 });
      setRemainingAttempts(MAX_ATTEMPTS - 1);
      return;
    }

    // Increment attempt count
    const newCount = data.count + 1;
    setRateLimitData({ timestamp: data.timestamp, count: newCount });
    setRemainingAttempts(MAX_ATTEMPTS - newCount);

    if (newCount >= MAX_ATTEMPTS) {
      setIsRateLimited(true);
    }
  }, [getRateLimitData, setRateLimitData]);

  const resetRateLimit = useCallback(() => {
    setRateLimitData({ timestamp: Date.now(), count: 0 });
    setIsRateLimited(false);
    setRemainingAttempts(MAX_ATTEMPTS);
  }, [setRateLimitData]);

  const getTimeUntilReset = useCallback((): number => {
    const data = getRateLimitData();
    const elapsed = Date.now() - data.timestamp;
    const remaining = RATE_LIMIT_WINDOW - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000 / 60)); // minutes
  }, [getRateLimitData]);

  return {
    isRateLimited,
    remainingAttempts,
    checkRateLimit,
    recordAttempt,
    resetRateLimit,
    getTimeUntilReset,
  };
};
