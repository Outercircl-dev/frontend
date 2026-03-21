import { BreadcrumbItem } from '@/components/seo/BreadcrumbStructuredData';
import { FAQItem } from '@/components/seo/FAQStructuredData';

/**
 * Dynamic SEO utilities for generating page-specific meta data
 */

export interface DynamicSEOData {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl: string;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
  structuredData?: object;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
}

/**
 * Generate SEO data for event detail pages
 */
export const generateEventSEO = (event: {
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  organizer: string;
  image?: string;
  id: string;
}): DynamicSEOData => {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    title: `${event.title} - ${formattedDate} in ${event.location}`,
    description: `Join "${event.title}" hosted by ${event.organizer} on ${formattedDate} in ${event.location}. ${event.description.substring(0, 100)}...`,
    keywords: `${event.category}, ${event.location}, activity, event, meetup, ${event.organizer}, community`,
    canonicalUrl: `https://outercircl.com/event/${event.id}`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Dashboard', url: '/dashboard' },
      { name: event.category, url: `/dashboard?category=${event.category}` },
      { name: event.title, url: `/event/${event.id}` }
    ],
    openGraph: {
      title: event.title,
      description: `Join this ${event.category} activity on ${formattedDate} in ${event.location}`,
      image: event.image,
      type: 'article'
    }
  };
};

/**
 * Generate SEO data for profile pages
 */
export const generateProfileSEO = (profile: {
  username: string;
  displayName?: string;
  bio?: string;
  city?: string;
  activityCount?: number;
  joinedDate?: string;
}): DynamicSEOData => {
  const displayName = profile.displayName || profile.username;
  const locationText = profile.city ? ` in ${profile.city}` : '';
  const activityText = profile.activityCount ? ` with ${profile.activityCount} activities` : '';

  return {
    title: `${displayName} - outercircl Profile`,
    description: `Connect with ${displayName}${locationText}${activityText}. ${profile.bio || 'Join activities and meet new people in your community.'}`,
    keywords: `${profile.username}, ${displayName}, profile, activities, community${profile.city ? `, ${profile.city}` : ''}`,
    canonicalUrl: `https://outercircl.com/profile/${profile.username}`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Community', url: '/dashboard' },
      { name: displayName, url: `/profile/${profile.username}` }
    ]
  };
};

/**
 * Generate SEO data for category pages
 */
export const generateCategorySEO = (category: {
  name: string;
  slug: string;
  description: string;
  eventCount?: number;
  popularActivities?: string[];
}): DynamicSEOData => {
  const eventCountText = category.eventCount ? ` with ${category.eventCount} upcoming activities` : '';
  const popularText = category.popularActivities ? ` including ${category.popularActivities.join(', ')}` : '';

  return {
    title: `${category.name} Activities - Find Local ${category.name} Groups`,
    description: `Discover ${category.name.toLowerCase()} activities in your area${eventCountText}${popularText}. ${category.description}`,
    keywords: `${category.name}, activities, local, community, meetups, groups, events`,
    canonicalUrl: `https://outercircl.com/dashboard?category=${category.slug}`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Dashboard', url: '/dashboard' },
      { name: category.name, url: `/dashboard?category=${category.slug}` }
    ],
    faqs: [
      {
        question: `What types of ${category.name.toLowerCase()} activities are available?`,
        answer: `We offer a wide variety of ${category.name.toLowerCase()} activities including ${category.popularActivities?.join(', ') || 'group meetups, skill-building sessions, and social events'}.`
      },
      {
        question: `How do I find ${category.name.toLowerCase()} activities near me?`,
        answer: `Use our dashboard to filter by location and category. You can see all ${category.name.toLowerCase()} activities happening in your area with distance and timing information.`
      },
      {
        question: `Can I create my own ${category.name.toLowerCase()} activity?`,
        answer: `Yes! Click 'Create Activity' to host your own ${category.name.toLowerCase()} event. Set the location, time, and invite others from the community to join.`
      }
    ]
  };
};

/**
 * Generate location-based SEO data
 */
export const generateLocationSEO = (location: {
  city: string;
  state?: string;
  country?: string;
  eventCount?: number;
  popularCategories?: string[];
}): DynamicSEOData => {
  const fullLocation = [location.city, location.state, location.country].filter(Boolean).join(', ');
  const eventText = location.eventCount ? ` with ${location.eventCount} active community members` : '';
  const categoriesText = location.popularCategories ? ` including ${location.popularCategories.join(', ')}` : '';

  return {
    title: `Activities in ${fullLocation} - Local Community Events`,
    description: `Find activity buddies and join local events in ${fullLocation}${eventText}. Discover activities${categoriesText} happening near you.`,
    keywords: `${location.city}, ${location.state}, activities, events, local, community, meetups`,
    canonicalUrl: `https://outercircl.com/location/${location.city.toLowerCase().replace(/\s+/g, '-')}`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Locations', url: '/dashboard' },
      { name: fullLocation, url: `/location/${location.city.toLowerCase().replace(/\s+/g, '-')}` }
    ]
  };
};

/**
 * Generate rich snippets for search results
 */
export const generateRichSnippets = (type: 'event' | 'profile' | 'organization', data: any) => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": type === 'event' ? 'Event' : type === 'profile' ? 'Person' : 'Organization'
  };

  switch (type) {
    case 'event':
      return {
        ...baseData,
        "@type": "Event",
        "name": data.title,
        "description": data.description,
        "startDate": data.startDate,
        "location": {
          "@type": "Place",
          "name": data.location
        },
        "organizer": {
          "@type": "Person",
          "name": data.organizer
        }
      };

    case 'profile':
      return {
        ...baseData,
        "@type": "Person",
        "name": data.displayName || data.username,
        "description": data.bio,
        "url": `https://outercircl.com/profile/${data.username}`,
        "sameAs": data.socialLinks || []
      };

    case 'organization':
      return {
        ...baseData,
        "@type": "Organization",
        "name": "outercircl",
        "url": "https://outercircl.com",
        "logo": "https://outercircl.com/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png",
        "description": "Find activity buddies and connect with your local community",
        "foundingDate": "2024",
        "serviceArea": "Worldwide"
      };

    default:
      return baseData;
  }
};