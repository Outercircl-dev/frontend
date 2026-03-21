export const ACTIVITY_CATEGORY_OPTIONS = [
  'Sports & Fitness',
  'Health & Wellness',
  'Education & Skills',
  'Work & Professional',
  'Social & Community',
  'Games & Entertainment',
  'Arts & Culture',
  'Adventure & Exploration',
  'Spiritual & Faith',
  'Technology & Innovation',
  'Other Hobbies & Leisure',
] as const

export type ActivityCategoryOption = (typeof ACTIVITY_CATEGORY_OPTIONS)[number]
