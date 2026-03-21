import React from 'react';
import { Helmet } from 'react-helmet-async';

interface EventData {
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
  price?: number;
  currency?: string;
  category?: string;
  capacity?: number;
  attendeeCount?: number;
  isOnline?: boolean;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
}

interface EventStructuredDataProps {
  event: EventData;
}

const EventStructuredData: React.FC<EventStructuredDataProps> = ({ event }) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.name,
    "description": event.description,
    "startDate": event.startDate,
    "endDate": event.endDate || event.startDate,
    "eventStatus": `https://schema.org/${event.eventStatus || 'EventScheduled'}`,
    "eventAttendanceMode": event.isOnline 
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    "location": event.isOnline ? {
      "@type": "VirtualLocation",
      "url": "https://outercircl.com"
    } : {
      "@type": "Place",
      "name": event.location.name,
      "address": event.location.address ? {
        "@type": "PostalAddress",
        "streetAddress": event.location.address
      } : undefined,
      "geo": event.location.latitude && event.location.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": event.location.latitude,
        "longitude": event.location.longitude
      } : undefined
    },
    "organizer": {
      "@type": "Person",
      "name": event.organizer.name,
      "url": event.organizer.url
    },
    "image": event.image ? (event.image.startsWith('http') ? event.image : `https://outercircl.com${event.image}`) : undefined,
    "offers": event.price !== undefined ? {
      "@type": "Offer",
      "price": event.price,
      "priceCurrency": event.currency || "USD",
      "availability": "https://schema.org/InStock",
      "validFrom": new Date().toISOString()
    } : {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "performer": {
      "@type": "Organization",
      "name": "outercircl Community",
      "url": "https://outercircl.com"
    },
    "audience": {
      "@type": "Audience",
      "audienceType": "Adults interested in " + (event.category || "community activities")
    },
    "maximumAttendeeCapacity": event.capacity,
    "typicalAgeRange": "18-65"
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default EventStructuredData;