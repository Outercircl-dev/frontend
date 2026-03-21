import { EventData } from '@/components/ActivityCard';

// Random image URLs for suggested events
const suggestedEventImages = [
  '/placeholder.svg',
  '/placeholder.svg',
  '/placeholder.svg',
  '/placeholder.svg',
  '/placeholder.svg',
  '/placeholder.svg',
];

// Random avatar URLs for hosts
const hostAvatars = [
  'https://randomuser.me/api/portraits/women/12.jpg',
  'https://randomuser.me/api/portraits/men/45.jpg',
  'https://randomuser.me/api/portraits/women/68.jpg',
  'https://randomuser.me/api/portraits/men/22.jpg',
];

// Host names
const hostNames = [
  'Community Organizer',
  'Local Guide',
  'Activity Host',
  'Event Planner',
  'Group Leader',
];

// Category-based event suggestions
const categoryEventSuggestions: Record<string, EventData[]> = {
  'Arts': [
    {
      id: 'suggested-arts-1',
      title: 'Community Mural Painting',
      description: 'Join us to create a beautiful community mural! No experience needed, just bring your creativity and enthusiasm.',
      imageUrl: suggestedEventImages[0],
      date: getFutureDate(7),
      time: '10:00 AM',
      location: 'Community Art Center',
      attendees: 15,
      maxAttendees: 30,
      categories: ['Arts'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-arts-2',
      title: 'Pottery Workshop for Beginners',
      description: 'Learn the basics of pottery in this hands-on workshop. Materials provided.',
      imageUrl: suggestedEventImages[1],
      date: getFutureDate(14),
      time: '2:00 PM',
      location: 'Clay Studio Downtown',
      attendees: 8,
      maxAttendees: 12,
      categories: ['Arts', 'Workshop'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
  'Technology': [
    {
      id: 'suggested-tech-1',
      title: 'Coding Bootcamp Introduction',
      description: 'A free introduction to our coding bootcamp. Learn about web development basics and meet other tech enthusiasts.',
      imageUrl: suggestedEventImages[2],
      date: getFutureDate(5),
      time: '6:30 PM',
      location: 'Tech Hub Co-working Space',
      attendees: 25,
      maxAttendees: 40,
      categories: ['Technology', 'Education'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-tech-2',
      title: 'AI Ethics Discussion Group',
      description: 'Join us for a thoughtful discussion on the ethical implications of artificial intelligence in society.',
      imageUrl: suggestedEventImages[3],
      date: getFutureDate(10),
      time: '7:00 PM',
      location: 'University Innovation Center',
      attendees: 12,
      maxAttendees: 20,
      categories: ['Technology', 'Discussion'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
  'Outdoors': [
    {
      id: 'suggested-outdoors-1',
      title: 'Sunrise Hiking Adventure',
      description: 'Experience the beauty of sunrise from the mountain peak! Moderate difficulty, bring water and snacks.',
      imageUrl: suggestedEventImages[4],
      date: getFutureDate(3),
      time: '5:30 AM',
      location: 'Eagle Mountain Trailhead',
      attendees: 10,
      maxAttendees: 15,
      categories: ['Outdoors', 'Sports & Fitness'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-outdoors-2',
      title: 'Urban Bird Watching Tour',
      description: 'Discover the surprising variety of birds living in our urban environment. Binoculars provided.',
      imageUrl: suggestedEventImages[5],
      date: getFutureDate(8),
      time: '8:00 AM',
      location: 'City Park Main Entrance',
      attendees: 6,
      maxAttendees: 12,
      categories: ['Outdoors', 'Nature'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
  'Sports & Fitness': [
    {
      id: 'suggested-fitness-1',
      title: 'Park Yoga for All Levels',
      description: 'Relax and rejuvenate with an outdoor yoga session suitable for all experience levels. Bring your own mat.',
      imageUrl: suggestedEventImages[0],
      date: getFutureDate(2),
      time: '9:00 AM',
      location: 'Riverside Park Lawn',
      attendees: 20,
      maxAttendees: 30,
      categories: ['Sports & Fitness', 'Wellness'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-fitness-2',
      title: 'Group Running Session',
      description: 'Join fellow runners for a supportive group run. Multiple pace groups available for all levels.',
      imageUrl: suggestedEventImages[1],
      date: getFutureDate(4),
      time: '6:00 PM',
      location: 'Track and Field Stadium',
      attendees: 15,
      maxAttendees: 25,
      categories: ['Sports & Fitness'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
  'Food': [
    {
      id: 'suggested-food-1',
      title: 'International Cuisine Potluck',
      description: 'Share your favorite dish from around the world at our community potluck dinner.',
      imageUrl: suggestedEventImages[2],
      date: getFutureDate(9),
      time: '6:00 PM',
      location: 'Community Center Hall',
      attendees: 18,
      maxAttendees: 30,
      categories: ['Food', 'Social'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-food-2',
      title: 'Farm-to-Table Cooking Class',
      description: 'Learn to prepare delicious meals using fresh, locally-sourced ingredients.',
      imageUrl: suggestedEventImages[3],
      date: getFutureDate(12),
      time: '5:30 PM',
      location: 'Culinary School Downtown',
      attendees: 10,
      maxAttendees: 14,
      categories: ['Food', 'Workshop'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
  'Books': [
    {
      id: 'suggested-books-1',
      title: 'Science Fiction Book Club',
      description: 'Discuss this month\'s science fiction novel selection with fellow enthusiasts.',
      imageUrl: suggestedEventImages[4],
      date: getFutureDate(6),
      time: '7:30 PM',
      location: 'Independent Bookstore Cafe',
      attendees: 8,
      maxAttendees: 12,
      categories: ['Books', 'Discussion'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-books-2',
      title: 'Poetry Reading Night',
      description: 'Listen to local poets or share your own work at our monthly poetry event.',
      imageUrl: suggestedEventImages[5],
      date: getFutureDate(15),
      time: '8:00 PM',
      location: 'Arts Center Auditorium',
      attendees: 12,
      maxAttendees: 25,
      categories: ['Books', 'Arts'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
  'Discussion': [
    {
      id: 'suggested-discussion-1',
      title: 'Current Events Discussion Circle',
      description: 'Join a respectful, moderated discussion about important current events and world issues.',
      imageUrl: suggestedEventImages[0],
      date: getFutureDate(5),
      time: '7:00 PM',
      location: 'Public Library Meeting Room',
      attendees: 14,
      maxAttendees: 20,
      categories: ['Discussion', 'Education'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
    {
      id: 'suggested-discussion-2',
      title: 'Philosophy Cafe: Life\'s Big Questions',
      description: 'Explore philosophical questions in a casual, friendly environment. No prior knowledge needed.',
      imageUrl: suggestedEventImages[1],
      date: getFutureDate(11),
      time: '6:30 PM',
      location: 'Local Coffee House',
      attendees: 10,
      maxAttendees: 15,
      categories: ['Discussion', 'Education'],
      host: {
        name: `${getRandomItem(hostNames)}`,
        avatar: getRandomItem(hostAvatars),
      },
    },
  ],
};

// Default suggestions for categories not specifically covered
const defaultEventSuggestions: EventData[] = [
  {
    id: 'suggested-default-1',
    title: 'Community Meetup',
    description: 'Meet others in your community who share your interests. A casual gathering to make connections.',
    imageUrl: suggestedEventImages[2],
    date: getFutureDate(4),
    time: '6:30 PM',
    location: 'Local Community Center',
    attendees: 12,
    maxAttendees: 25,
    categories: ['Social'],
    host: {
      name: `${getRandomItem(hostNames)}`,
      avatar: getRandomItem(hostAvatars),
    },
  },
  {
    id: 'suggested-default-2',
    title: 'Skills Exchange Workshop',
    description: 'Share your skills and learn from others in this community exchange activity.',
    imageUrl: suggestedEventImages[3],
    date: getFutureDate(10),
    time: '2:00 PM',
    location: 'Public Library Workshop Space',
    attendees: 15,
    maxAttendees: 20,
    categories: ['Workshop', 'Education'],
    host: {
      name: `${getRandomItem(hostNames)}`,
      avatar: getRandomItem(hostAvatars),
    },
  },
];

// Helper function to get a date in the future
function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// Helper function to get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Get suggested events for a specific category or categories
export function getSuggestedEvents(categories: string[], count: number = 2): EventData[] {
  let suggestions: EventData[] = [];
  
  // Try to find specific suggestions for each category
  categories.forEach(category => {
    if (categoryEventSuggestions[category]) {
      suggestions = [
        ...suggestions, 
        ...categoryEventSuggestions[category]
      ];
    }
  });
  
  // If we don't have enough or any suggestions, add some default ones
  if (suggestions.length < count) {
    suggestions = [
      ...suggestions,
      ...defaultEventSuggestions.slice(0, count - suggestions.length)
    ];
  }
  
  // Ensure we don't return more than requested
  return suggestions.slice(0, count);
}

// Create a suggested event with a specified category
export function createSuggestedEvent(category: string): EventData {
  const categoryEvents = categoryEventSuggestions[category];
  
  // If we have pre-defined events for this category, return one
  if (categoryEvents && categoryEvents.length > 0) {
    return { ...getRandomItem(categoryEvents) };
  }
  
  // Otherwise create a generic one with the requested category
  return {
    id: `suggested-${category.toLowerCase()}-${Date.now()}`,
    title: `${category} Enthusiasts Meetup`,
    description: `Connect with others interested in ${category} in your local area. Share experiences and make new friends.`,
    imageUrl: getRandomItem(suggestedEventImages),
    date: getFutureDate(Math.floor(Math.random() * 14) + 1),
    time: '6:00 PM',
    location: 'Local Community Space',
    attendees: Math.floor(Math.random() * 15) + 5,
    maxAttendees: Math.floor(Math.random() * 15) + 20,
    categories: [category],
    host: {
      name: getRandomItem(hostNames),
      avatar: getRandomItem(hostAvatars),
    },
  };
}
