/**
 * Enhanced structured data schemas for better SEO
 */

export interface EventData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  organizer: {
    name: string;
    url?: string;
  };
  image?: string;
  url: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventMovedOnline' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OnlineEventAttendanceMode' | 'OfflineEventAttendanceMode' | 'MixedEventAttendanceMode';
  price?: {
    currency: string;
    amount: number;
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface OrganizationData {
  name: string;
  url: string;
  logo: string;
  description: string;
  contactPoint?: {
    telephone?: string;
    email?: string;
    contactType: string;
  };
  sameAs?: string[];
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
}

export const generateEventSchema = (event: EventData) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.name,
  "description": event.description,
  "startDate": event.startDate,
  "endDate": event.endDate,
  "eventStatus": `https://schema.org/${event.eventStatus || 'EventScheduled'}`,
  "eventAttendanceMode": `https://schema.org/${event.eventAttendanceMode || 'OfflineEventAttendanceMode'}`,
  "location": {
    "@type": "Place",
    "name": event.location.name,
    "address": event.location.address,
    ...(event.location.latitude && event.location.longitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": event.location.latitude,
        "longitude": event.location.longitude
      }
    })
  },
  "organizer": {
    "@type": "Organization",
    "name": event.organizer.name,
    "url": event.organizer.url
  },
  "image": event.image,
  "url": event.url,
  ...(event.price && {
    "offers": {
      "@type": "Offer",
      "price": event.price.amount,
      "priceCurrency": event.price.currency,
      "availability": "https://schema.org/InStock"
    }
  })
});

export const generateBreadcrumbSchema = (breadcrumbs: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((item, index) => ({
    "@type": "ListItem",
    "position": item.position || index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const generateFAQSchema = (faqs: FAQItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

export const generateOrganizationSchema = (org: OrganizationData) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": org.name,
  "url": org.url,
  "logo": {
    "@type": "ImageObject",
    "url": org.logo
  },
  "description": org.description,
  ...(org.contactPoint && {
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": org.contactPoint.telephone,
      "email": org.contactPoint.email,
      "contactType": org.contactPoint.contactType
    }
  }),
  ...(org.sameAs && { "sameAs": org.sameAs }),
  ...(org.address && {
    "address": {
      "@type": "PostalAddress",
      "streetAddress": org.address.streetAddress,
      "addressLocality": org.address.addressLocality,
      "addressRegion": org.address.addressRegion,
      "postalCode": org.address.postalCode,
      "addressCountry": org.address.addressCountry
    }
  })
});

export const generateLocalBusinessSchema = (business: OrganizationData & { 
  businessType?: string;
  openingHours?: string[];
  priceRange?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": business.businessType || "LocalBusiness",
  "name": business.name,
  "url": business.url,
  "logo": business.logo,
  "description": business.description,
  ...(business.openingHours && { "openingHours": business.openingHours }),
  ...(business.priceRange && { "priceRange": business.priceRange }),
  ...(business.address && {
    "address": {
      "@type": "PostalAddress",
      "streetAddress": business.address.streetAddress,
      "addressLocality": business.address.addressLocality,
      "addressRegion": business.address.addressRegion,
      "postalCode": business.address.postalCode,
      "addressCountry": business.address.addressCountry
    }
  })
});

// Default organization data for outercircl
export const outercirclOrganization: OrganizationData = {
  name: "outercircl",
  url: "https://outercircl.com",
  logo: "https://outercircl.com/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png",
  description: "Find activity buddies and connect with your local community. Discover hiking groups, book clubs, sports teams, and more activities happening near you.",
  contactPoint: {
    email: "hello@outercircl.com",
    contactType: "customer service"
  }
};

export default {
  generateEventSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  outercirclOrganization
};