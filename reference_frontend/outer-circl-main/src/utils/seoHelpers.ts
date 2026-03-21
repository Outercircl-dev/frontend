/**
 * SEO Helper utilities for generating consistent and optimized metadata
 * This replaces multiple SEO components and ensures no duplication
 */

export interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  structuredData?: object;
}

export const generatePageTitle = (pageTitle: string, includesBrand = false): string => {
  if (includesBrand) return pageTitle;
  return `${pageTitle} | outercircl`;
};

export const generateCanonicalUrl = (path: string): string => {
  // Ensure no double slashes and proper domain
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `https://outercircl.com${cleanPath}`;
};

export const generateStructuredData = (data: SEOData) => {
  const baseStructuredData = {
    "@context": "https://schema.org",
    "@type": data.type === 'article' ? 'Article' : 'WebPage',
    "name": data.title,
    "description": data.description,
    "url": data.canonicalUrl,
    "inLanguage": "en-US",
    "isPartOf": {
      "@type": "WebSite",
      "@id": "https://outercircl.com",
      "name": "outercircl",
      "url": "https://outercircl.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "outercircl",
      "url": "https://outercircl.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://outercircl.com/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png",
        "width": 512,
        "height": 512
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": data.canonicalUrl
    }
  };

  return data.structuredData || baseStructuredData;
};

// FAQ data for common pages
export const helpCenterFAQs = [
  {
    question: "How do I find activities near me?",
    answer: "Use our dashboard to browse activities in your area. You can filter by category, distance, and date to find the perfect activity buddy opportunities."
  },
  {
    question: "Is outercircl free to use?",
    answer: "Yes! outercircl offers a free tier that lets you join activities and connect with your community. Premium memberships unlock additional features like hosting unlimited activities."
  },
  {
    question: "How do I create my first activity?",
    answer: "Click 'Create Activity' in the navigation menu, fill out the activity details including location, time, and description, then publish it for others to discover and join."
  },
  {
    question: "What types of activities can I find?",
    answer: "From outdoor adventures like hiking and cycling to indoor activities like book clubs and board games, outercircl hosts diverse community activities for all interests."
  },
  {
    question: "How do I join an activity?",
    answer: "Browse activities on the dashboard, click on one that interests you, and hit the 'Join Activity' button. You'll receive confirmation and can chat with other participants."
  },
  {
    question: "Can I use outercircl on my mobile device?",
    answer: "Yes! outercircl is optimized for mobile use and can be installed as a PWA (Progressive Web App) for a native app-like experience with offline capabilities."
  },
  {
    question: "What if I lose internet connection while using the app?",
    answer: "outercircl works offline for many features thanks to our PWA technology. You can browse cached activities and the app will sync when you're back online."
  }
];

export const membershipFAQs = [
  {
    question: "What's included in the Premium membership?",
    answer: "Premium members can host unlimited activities, access advanced filtering options, get priority support, and enjoy additional community features."
  },
  {
    question: "Can I cancel my membership anytime?",
    answer: "Yes, you can cancel your membership at any time from your account settings. Your premium features will remain active until the end of your billing period."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for new premium memberships. Contact our support team if you're not satisfied with your experience."
  }
];

// Pre-defined SEO data for common pages
export const commonSEOData = {
  homepage: {
    title: "outercircl - Find an activity friend near you",
    description: "Join Outer Circle to find activity buddies and connect with your local community. Discover hiking groups, book clubs, sports teams, and more activities happening near you.",
    keywords: "activity buddies, local events, community, meetups, social activities, find friends, local groups, outdoor activities, sports clubs",
    canonicalUrl: "https://outercircl.com/",
    type: "website" as const
  },
  dashboard: {
    title: "Dashboard - Discover Activities Near You",
    description: "Browse local activities, connect with activity buddies, and join events happening in your community. Find hiking groups, book clubs, sports teams, and more.",
    keywords: "dashboard, local activities, find events, activity buddies, community events, join activities",
    canonicalUrl: "https://outercircl.com/dashboard",
    noIndex: false,
    type: "website" as const
  },
  membership: {
    title: "Membership Plans - outercircl",
    description: "Choose the perfect membership plan for your activity needs. Standard and Premium options available.",
    keywords: "membership plans, premium features, activity community, subscription",
    canonicalUrl: "https://outercircl.com/membership",
    type: "website" as const
  },
  aboutUs: {
    title: "About Us - Connect and Try Something New Together",
    description: "Learn about outercircl's mission to help people find activity buddies and connect with their local community. Whether it's a morning walk, ocean dip, or playground playdate - try something new, together!",
    keywords: "about outercircl, our story, community building, activity friends, local connections, social activities",
    canonicalUrl: "https://outercircl.com/about-us",
    type: "website" as const
  },
  contactUs: {
    title: "Contact Us",
    description: "Get in touch with the Outer Circle team. We're here to help with questions about activities, membership, or technical support.",
    keywords: "contact outer circle, customer support, help, questions, technical support",
    canonicalUrl: "https://outercircl.com/contact-us",
    type: "website" as const
  },
  helpCenter: {
    title: "Help Center",
    description: "Find answers to common questions about Outer Circle. Get help with navigation, account settings, terminology, and more.",
    keywords: "help center, FAQ, support, how to use outer circle, account help, navigation guide",
    canonicalUrl: "https://outercircl.com/help",
    type: "website" as const
  }
} as const;

export default {
  generatePageTitle,
  generateCanonicalUrl,
  generateStructuredData,
  commonSEOData,
  helpCenterFAQs,
  membershipFAQs
};