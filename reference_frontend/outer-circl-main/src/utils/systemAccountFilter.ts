/**
 * System Account Filtering Utilities
 * Centralized logic to identify and filter out system accounts from user-facing features
 */

export interface SystemUser {
  id: string;
  username?: string;
  name?: string;
}

/**
 * Check if a user is a system account based on username patterns
 */
export const isSystemAccount = (user: SystemUser): boolean => {
  if (!user.username) return false;
  
  const systemPatterns = [
    /system/i,
    /outercircl_system/i,
    /admin/i,
    /bot/i,
    /service/i,
    /automated/i,
  ];
  
  return systemPatterns.some(pattern => pattern.test(user.username || ''));
};

/**
 * Filter out system accounts from a list of users
 */
export const filterSystemAccounts = <T extends SystemUser>(users: T[]): T[] => {
  return users.filter(user => !isSystemAccount(user));
};

/**
 * Check if friendship interactions should be allowed with this user
 */
export const canInteractWithUser = (user: SystemUser): boolean => {
  return !isSystemAccount(user);
};