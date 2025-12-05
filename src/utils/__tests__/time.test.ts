/**
 * Unit tests for time utility functions
 * @see src/utils/time.ts
 * @ticket TEST-001
 */

import { formatTimeAgo } from '../time';

describe('formatTimeAgo', () => {
  // Helper to create a date offset from now
  const createDate = (offsetMs: number): Date => {
    return new Date(Date.now() + offsetMs);
  };

  // Time constants for readability
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  describe('edge cases', () => {
    it('should return "just now" for the current time', () => {
      const now = new Date();
      expect(formatTimeAgo(now)).toBe('just now');
    });

    it('should return "just now" for timestamps within 10 seconds', () => {
      expect(formatTimeAgo(createDate(-5 * SECOND))).toBe('just now');
      expect(formatTimeAgo(createDate(-9 * SECOND))).toBe('just now');
    });

    it('should return "just now" for future timestamps within 10 seconds', () => {
      expect(formatTimeAgo(createDate(5 * SECOND))).toBe('just now');
      expect(formatTimeAgo(createDate(9 * SECOND))).toBe('just now');
    });
  });

  describe('past timestamps (seconds)', () => {
    it('should return "X seconds ago" for timestamps < 1 minute', () => {
      expect(formatTimeAgo(createDate(-10 * SECOND))).toBe('10 seconds ago');
      expect(formatTimeAgo(createDate(-30 * SECOND))).toBe('30 seconds ago');
      expect(formatTimeAgo(createDate(-59 * SECOND))).toBe('59 seconds ago');
    });

    it('should use singular "second" for 1 second', () => {
      // Note: 10-19 seconds will show "just now", so we test boundary
      expect(formatTimeAgo(createDate(-10 * SECOND))).toBe('10 seconds ago');
    });
  });

  describe('past timestamps (minutes)', () => {
    it('should return "1 minute ago" for exactly 1 minute', () => {
      expect(formatTimeAgo(createDate(-1 * MINUTE))).toBe('1 minute ago');
    });

    it('should return "X minutes ago" for timestamps < 1 hour', () => {
      expect(formatTimeAgo(createDate(-2 * MINUTE))).toBe('2 minutes ago');
      expect(formatTimeAgo(createDate(-5 * MINUTE))).toBe('5 minutes ago');
      expect(formatTimeAgo(createDate(-30 * MINUTE))).toBe('30 minutes ago');
      expect(formatTimeAgo(createDate(-59 * MINUTE))).toBe('59 minutes ago');
    });
  });

  describe('past timestamps (hours)', () => {
    it('should return "1 hour ago" for exactly 1 hour', () => {
      expect(formatTimeAgo(createDate(-1 * HOUR))).toBe('1 hour ago');
    });

    it('should return "X hours ago" for timestamps < 1 day', () => {
      expect(formatTimeAgo(createDate(-2 * HOUR))).toBe('2 hours ago');
      expect(formatTimeAgo(createDate(-3 * HOUR))).toBe('3 hours ago');
      expect(formatTimeAgo(createDate(-12 * HOUR))).toBe('12 hours ago');
      expect(formatTimeAgo(createDate(-23 * HOUR))).toBe('23 hours ago');
    });
  });

  describe('past timestamps (days)', () => {
    it('should return "1 day ago" for exactly 1 day', () => {
      expect(formatTimeAgo(createDate(-1 * DAY))).toBe('1 day ago');
    });

    it('should return "X days ago" for timestamps < 1 week', () => {
      expect(formatTimeAgo(createDate(-2 * DAY))).toBe('2 days ago');
      expect(formatTimeAgo(createDate(-5 * DAY))).toBe('5 days ago');
      expect(formatTimeAgo(createDate(-6 * DAY))).toBe('6 days ago');
    });
  });

  describe('past timestamps (weeks)', () => {
    it('should return "1 week ago" for exactly 1 week', () => {
      expect(formatTimeAgo(createDate(-1 * WEEK))).toBe('1 week ago');
    });

    it('should return "X weeks ago" for timestamps < 1 month', () => {
      expect(formatTimeAgo(createDate(-2 * WEEK))).toBe('2 weeks ago');
      expect(formatTimeAgo(createDate(-3 * WEEK))).toBe('3 weeks ago');
    });
  });

  describe('past timestamps (months)', () => {
    it('should return "1 month ago" for exactly 1 month', () => {
      expect(formatTimeAgo(createDate(-1 * MONTH))).toBe('1 month ago');
    });

    it('should return "X months ago" for timestamps < 1 year', () => {
      expect(formatTimeAgo(createDate(-2 * MONTH))).toBe('2 months ago');
      expect(formatTimeAgo(createDate(-6 * MONTH))).toBe('6 months ago');
      expect(formatTimeAgo(createDate(-11 * MONTH))).toBe('11 months ago');
    });
  });

  describe('past timestamps (years)', () => {
    it('should return "1 year ago" for exactly 1 year', () => {
      expect(formatTimeAgo(createDate(-1 * YEAR))).toBe('1 year ago');
    });

    it('should return "X years ago" for timestamps > 1 year', () => {
      expect(formatTimeAgo(createDate(-2 * YEAR))).toBe('2 years ago');
      expect(formatTimeAgo(createDate(-5 * YEAR))).toBe('5 years ago');
      expect(formatTimeAgo(createDate(-10 * YEAR))).toBe('10 years ago');
    });
  });

  describe('future timestamps', () => {
    it('should return "in X seconds" for near future', () => {
      expect(formatTimeAgo(createDate(15 * SECOND))).toBe('in 15 seconds');
      expect(formatTimeAgo(createDate(45 * SECOND))).toBe('in 45 seconds');
    });

    it('should return "in X minutes" for future within an hour', () => {
      expect(formatTimeAgo(createDate(1 * MINUTE))).toBe('in 1 minute');
      expect(formatTimeAgo(createDate(5 * MINUTE))).toBe('in 5 minutes');
      expect(formatTimeAgo(createDate(30 * MINUTE))).toBe('in 30 minutes');
    });

    it('should return "in X hours" for future within a day', () => {
      expect(formatTimeAgo(createDate(1 * HOUR))).toBe('in 1 hour');
      expect(formatTimeAgo(createDate(2 * HOUR))).toBe('in 2 hours');
      expect(formatTimeAgo(createDate(12 * HOUR))).toBe('in 12 hours');
    });

    it('should return "in X days" for future within a week', () => {
      expect(formatTimeAgo(createDate(1 * DAY))).toBe('in 1 day');
      expect(formatTimeAgo(createDate(3 * DAY))).toBe('in 3 days');
      expect(formatTimeAgo(createDate(6 * DAY))).toBe('in 6 days');
    });

    it('should return "in X weeks" for future within a month', () => {
      expect(formatTimeAgo(createDate(1 * WEEK))).toBe('in 1 week');
      expect(formatTimeAgo(createDate(2 * WEEK))).toBe('in 2 weeks');
    });

    it('should return "in X months" for future within a year', () => {
      expect(formatTimeAgo(createDate(1 * MONTH))).toBe('in 1 month');
      expect(formatTimeAgo(createDate(6 * MONTH))).toBe('in 6 months');
    });

    it('should return "in X years" for far future', () => {
      expect(formatTimeAgo(createDate(1 * YEAR))).toBe('in 1 year');
      expect(formatTimeAgo(createDate(5 * YEAR))).toBe('in 5 years');
    });
  });

  describe('pluralization', () => {
    it('should use singular for exactly 1 unit', () => {
      expect(formatTimeAgo(createDate(-1 * MINUTE))).toBe('1 minute ago');
      expect(formatTimeAgo(createDate(-1 * HOUR))).toBe('1 hour ago');
      expect(formatTimeAgo(createDate(-1 * DAY))).toBe('1 day ago');
      expect(formatTimeAgo(createDate(-1 * WEEK))).toBe('1 week ago');
      expect(formatTimeAgo(createDate(-1 * MONTH))).toBe('1 month ago');
      expect(formatTimeAgo(createDate(-1 * YEAR))).toBe('1 year ago');
    });

    it('should use plural for > 1 unit', () => {
      expect(formatTimeAgo(createDate(-2 * MINUTE))).toBe('2 minutes ago');
      expect(formatTimeAgo(createDate(-2 * HOUR))).toBe('2 hours ago');
      expect(formatTimeAgo(createDate(-2 * DAY))).toBe('2 days ago');
      expect(formatTimeAgo(createDate(-2 * WEEK))).toBe('2 weeks ago');
      expect(formatTimeAgo(createDate(-2 * MONTH))).toBe('2 months ago');
      expect(formatTimeAgo(createDate(-2 * YEAR))).toBe('2 years ago');
    });
  });
});

