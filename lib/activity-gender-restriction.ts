import type { ActivityGenderRestriction } from '@/lib/types/activity'
import type { Gender } from '@/lib/types/profile'

export function meetsGenderRestriction(
  restriction: ActivityGenderRestriction,
  viewerGender: Gender | null,
): boolean {
  if (restriction === 'none') return true
  if (!viewerGender) return false
  if (restriction === 'men_only') return viewerGender === 'male'
  if (restriction === 'women_only') return viewerGender === 'female'
  return viewerGender === 'other'
}

export function genderRestrictionReason(restriction: ActivityGenderRestriction): string | null {
  if (restriction === 'none') return null
  if (restriction === 'men_only') return 'Gender restricted: only men can join this activity.'
  if (restriction === 'women_only') return 'Gender restricted: only women can join this activity.'
  return 'Gender restricted: only people with gender set to Other can join this activity.'
}
