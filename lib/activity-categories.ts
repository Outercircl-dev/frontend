// Copyright (c) 2026 Outer Circle. All rights reserved.

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

export type CategoryImageAttribution = {
  photographerName: string
  photographerUrl: string
  sourceName: 'Unsplash'
  sourceUrl: string
}

export const DEFAULT_ACTIVITY_IMAGE = '/default-activity.svg'

const CATEGORY_DEFAULT_IMAGES: Record<ActivityCategoryOption, string> = {
  'Sports & Fitness': '/category/sports_and_fitness.jpg',
  'Health & Wellness': '/category/health_and_wellness.jpg',
  'Education & Skills': '/category/education_and_skills.jpg',
  'Work & Professional': '/category/work_and_professional.jpg',
  'Social & Community': '/category/social_and_community.jpg',
  'Games & Entertainment': '/category/games_and_entertainment.jpg',
  'Arts & Culture': '/category/arts_and_culture.jpg',
  'Adventure & Exploration': '/category/adventure_and_exploration.jpg',
  'Spiritual & Faith': '/category/spiritual_and_faith.jpg',
  'Technology & Innovation': '/category/technology_and_innovation.jpg',
  'Other Hobbies & Leisure': '/category/other_hobies_and_leisure.jpg',
}

const CATEGORY_IMAGE_ATTRIBUTIONS: Record<ActivityCategoryOption, CategoryImageAttribution> = {
  'Sports & Fitness': {
    photographerName: 'Alexander Red',
    photographerUrl: 'https://unsplash.com/@alexandered7?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/man-tying-his-shoes-d3bYmnZ0ank?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Health & Wellness': {
    photographerName: 'Marea Wellness',
    photographerUrl: 'https://unsplash.com/@mareawellness?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/a-group-of-people-standing-on-top-of-a-lush-green-field-HIugtasuIOA?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Education & Skills': {
    photographerName: 'Vitaly Gariev',
    photographerUrl: 'https://unsplash.com/@silverkblack?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/students-talking-and-laughing-in-a-lecture-hall-TB5HpfJf7mA?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Work & Professional': {
    photographerName: 'Patrick Tomasso',
    photographerUrl: 'https://unsplash.com/@impatrickt?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/gray-computer-monitor-fMntI8HAAB8?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Social & Community': {
    photographerName: 'Hannah Busing',
    photographerUrl: 'https://unsplash.com/@hannahbusing?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/person-in-red-sweater-holding-babys-hand-Zyx1bK9mqmA?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Games & Entertainment': {
    photographerName: 'Jason Leung',
    photographerUrl: 'https://unsplash.com/@ninjason?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/retro-arcade-machines-glow-in-the-dark-eB5l2Y-MaZw?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Arts & Culture': {
    photographerName: 'russn_fckr',
    photographerUrl: 'https://unsplash.com/@russn_fckr?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/assorted-color-paints-krV5aS4jDjA?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Adventure & Exploration': {
    photographerName: 'Backroad Packers',
    photographerUrl: 'https://unsplash.com/@backroadpackers?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/man-in-red-jacket-standing-on-brown-rock-formation-during-daytime-laqqevc-GVY?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Spiritual & Faith': {
    photographerName: 'chris liu',
    photographerUrl: 'https://unsplash.com/@inchristalone?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/white-and-black-printed-paper-beside-white-and-black-lego-blocks-HpRSMx4xicA?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Technology & Innovation': {
    photographerName: 'Vitaly Gariev',
    photographerUrl: 'https://unsplash.com/@silverkblack?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/woman-using-virtual-reality-headset-indoors-near-window-A1T6Eetr2O4?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
  'Other Hobbies & Leisure': {
    photographerName: 'Jarritos Mexican Soda',
    photographerUrl: 'https://unsplash.com/@jarritos?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
    sourceName: 'Unsplash',
    sourceUrl:
      'https://unsplash.com/photos/2-women-sitting-on-green-grass-lawn-during-daytime-RnnKc2gFDOE?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText',
  },
}

function asActivityCategoryOption(
  category: string | null | undefined,
): ActivityCategoryOption | null {
  if (!category) return null
  return ACTIVITY_CATEGORY_OPTIONS.find((option) => option === category) ?? null
}

export function getActivityImageForCategory(
  category: string | null | undefined,
  imageUrl: string | null | undefined,
): { src: string; isDefault: boolean; category: ActivityCategoryOption | null } {
  if (imageUrl?.trim()) {
    return { src: imageUrl, isDefault: false, category: null }
  }
  const matchedCategory = asActivityCategoryOption(category)
  if (!matchedCategory) {
    return { src: DEFAULT_ACTIVITY_IMAGE, isDefault: false, category: null }
  }
  return {
    src: CATEGORY_DEFAULT_IMAGES[matchedCategory] ?? DEFAULT_ACTIVITY_IMAGE,
    isDefault: true,
    category: matchedCategory,
  }
}

export function getCategoryImageAttribution(
  category: ActivityCategoryOption | null | undefined,
): CategoryImageAttribution | null {
  if (!category) return null
  return CATEGORY_IMAGE_ATTRIBUTIONS[category] ?? null
}
