'use server'

import { cookies } from 'next/headers'
import type { Interest, InterestCategory } from '@/lib/types/profile'
import { createClient } from '@/lib/supabase/server'

export interface GetInterestsResult {
  interests: Interest[]
  categories: InterestCategory[]
  error: string | null
}

// Fallback interests when database is not available
const FALLBACK_INTERESTS: Interest[] = [
  // Sports & Fitness
  { id: '1', slug: 'running', name: 'Running', category: 'Sports & Fitness', icon: '🏃', sort_order: 1 },
  { id: '2', slug: 'cycling', name: 'Cycling', category: 'Sports & Fitness', icon: '🚴', sort_order: 2 },
  { id: '3', slug: 'swimming', name: 'Swimming', category: 'Sports & Fitness', icon: '🏊', sort_order: 3 },
  { id: '4', slug: 'hiking', name: 'Hiking', category: 'Sports & Fitness', icon: '🥾', sort_order: 4 },
  { id: '5', slug: 'yoga', name: 'Yoga', category: 'Sports & Fitness', icon: '🧘', sort_order: 5 },
  { id: '6', slug: 'gym', name: 'Gym & Fitness', category: 'Sports & Fitness', icon: '💪', sort_order: 6 },
  { id: '7', slug: 'cold_plunge', name: 'Cold Plunge', category: 'Sports & Fitness', icon: '🧊', sort_order: 7 },
  // Social
  { id: '8', slug: 'coffee', name: 'Coffee Meetups', category: 'Social', icon: '☕', sort_order: 10 },
  { id: '9', slug: 'brunch', name: 'Brunch', category: 'Social', icon: '🥂', sort_order: 11 },
  { id: '10', slug: 'pub_quiz', name: 'Pub Quiz', category: 'Social', icon: '🍺', sort_order: 12 },
  { id: '11', slug: 'board_games', name: 'Board Games', category: 'Social', icon: '🎲', sort_order: 13 },
  { id: '12', slug: 'dinner_parties', name: 'Dinner Parties', category: 'Social', icon: '🍽️', sort_order: 14 },
  // Creative
  { id: '13', slug: 'art', name: 'Art', category: 'Creative', icon: '🎨', sort_order: 20 },
  { id: '14', slug: 'photography', name: 'Photography', category: 'Creative', icon: '📷', sort_order: 21 },
  { id: '15', slug: 'music', name: 'Music', category: 'Creative', icon: '🎵', sort_order: 22 },
  { id: '16', slug: 'writing', name: 'Writing', category: 'Creative', icon: '✍️', sort_order: 23 },
  { id: '17', slug: 'crafts', name: 'Crafts', category: 'Creative', icon: '🧶', sort_order: 24 },
  // Learning
  { id: '18', slug: 'book_club', name: 'Book Club', category: 'Learning', icon: '📚', sort_order: 30 },
  { id: '19', slug: 'languages', name: 'Languages', category: 'Learning', icon: '🗣️', sort_order: 31 },
  { id: '20', slug: 'tech', name: 'Tech & Gadgets', category: 'Learning', icon: '💻', sort_order: 32 },
  { id: '21', slug: 'coding', name: 'Coding', category: 'Learning', icon: '👨‍💻', sort_order: 33 },
  { id: '22', slug: 'business', name: 'Business', category: 'Learning', icon: '💼', sort_order: 34 },
  // Outdoors
  { id: '23', slug: 'walking', name: 'Walking', category: 'Outdoors', icon: '🚶', sort_order: 40 },
  { id: '24', slug: 'gardening', name: 'Gardening', category: 'Outdoors', icon: '🌱', sort_order: 41 },
  { id: '25', slug: 'beach', name: 'Beach', category: 'Outdoors', icon: '🏖️', sort_order: 42 },
  { id: '26', slug: 'camping', name: 'Camping', category: 'Outdoors', icon: '⛺', sort_order: 43 },
  { id: '27', slug: 'nature', name: 'Nature Walks', category: 'Outdoors', icon: '🌿', sort_order: 44 },
  // Wellness
  { id: '28', slug: 'meditation', name: 'Meditation', category: 'Wellness', icon: '🧘', sort_order: 50 },
  { id: '29', slug: 'mindfulness', name: 'Mindfulness', category: 'Wellness', icon: '🙏', sort_order: 51 },
  { id: '30', slug: 'cooking', name: 'Cooking', category: 'Wellness', icon: '🍳', sort_order: 52 },
  { id: '31', slug: 'nutrition', name: 'Nutrition', category: 'Wellness', icon: '🥗', sort_order: 53 },
]

function groupInterestsByCategory(interests: Interest[]): InterestCategory[] {
  const categoryMap = new Map<string, Interest[]>()
  for (const interest of interests) {
    const existing = categoryMap.get(interest.category) || []
    categoryMap.set(interest.category, [...existing, interest])
  }

  return Array.from(categoryMap.entries()).map(([name, interests]) => ({
    name,
    interests,
  }))
}

export async function getInterestsAction(): Promise<GetInterestsResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('interests')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Get interests error (using fallback):', error.message)
      // Use fallback interests when database fails
      const categories = groupInterestsByCategory(FALLBACK_INTERESTS)
      return { interests: FALLBACK_INTERESTS, categories, error: null }
    }

    const interests = data && data.length > 0 ? data : FALLBACK_INTERESTS
    const categories = groupInterestsByCategory(interests)

    return { interests, categories, error: null }
  } catch (err) {
    console.error('Get interests exception (using fallback):', err)
    // Use fallback interests on any error
    const categories = groupInterestsByCategory(FALLBACK_INTERESTS)
    return { interests: FALLBACK_INTERESTS, categories, error: null }
  }
}

