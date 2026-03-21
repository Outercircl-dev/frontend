export interface UserProfile {
  gender?: string;
}

export interface Event {
  genderPreference?: 'male' | 'female' | 'no_preference';
  hostId?: string;
}

/**
 * Checks if a user can join an activity based on gender requirements
 */
export const canUserJoinActivity = (
  userProfile: UserProfile | null, 
  event: Event, 
  userId?: string
): { canJoin: boolean; reason?: string } => {
  // If user is the host, they can always join (they're already in)
  if (event.hostId === userId) {
    return { canJoin: true };
  }

  // If no gender preference is set or it's "no_preference", anyone can join
  if (!event.genderPreference || event.genderPreference === 'no_preference') {
    return { canJoin: true };
  }

  // If user profile doesn't exist or gender isn't set, deny access for gender-specific activities
  if (!userProfile || !userProfile.gender) {
    return { 
      canJoin: false, 
      reason: 'Please complete your profile with gender information to join this activity.' 
    };
  }

  // Check if user's gender matches the activity requirement
  if (event.genderPreference === userProfile.gender) {
    return { canJoin: true };
  }

  // Gender doesn't match the requirement
  const activityType = event.genderPreference === 'male' ? 'guys' : 'ladies';
  return { 
    canJoin: false, 
    reason: `This is a ${activityType}-only activity.` 
  };
};

/**
 * Gets a descriptive label for gender preference
 */
export const getGenderPreferenceLabel = (genderPreference?: string): string => {
  switch (genderPreference) {
    case 'male':
      return 'Guys Activity';
    case 'female':
      return 'Ladies Activity';
    case 'no_preference':
    default:
      return '';
  }
};