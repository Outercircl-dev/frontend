import { supabase } from '@/integrations/supabase/client';

export interface RegionalPreferences {
  countryCode: string;
  language: string;
  timeZone: string;
  currency: string;
  dateFormat: string;
}

export interface RegionalContent {
  categories: string[];
  featuredActivities: string[];
  culturalEvents: string[];
  seasonalSuggestions: string[];
}

class RegionalizationService {
  
  /**
   * Get regional preferences based on country code
   */
  getRegionalPreferences(countryCode: string): RegionalPreferences {
    const preferences: Record<string, RegionalPreferences> = {
      'US': {
        countryCode: 'US',
        language: 'en',
        timeZone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy'
      },
      'GB': {
        countryCode: 'GB',
        language: 'en-GB',
        timeZone: 'Europe/London',
        currency: 'GBP',
        dateFormat: 'dd/MM/yyyy'
      },
      'CA': {
        countryCode: 'CA',
        language: 'en-CA',
        timeZone: 'America/Toronto',
        currency: 'CAD',
        dateFormat: 'dd/MM/yyyy'
      },
      'AU': {
        countryCode: 'AU',
        language: 'en-AU',
        timeZone: 'Australia/Sydney',
        currency: 'AUD',
        dateFormat: 'dd/MM/yyyy'
      },
      'DE': {
        countryCode: 'DE',
        language: 'de',
        timeZone: 'Europe/Berlin',
        currency: 'EUR',
        dateFormat: 'dd.MM.yyyy'
      },
      'FR': {
        countryCode: 'FR',
        language: 'fr',
        timeZone: 'Europe/Paris',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy'
      },
      'ES': {
        countryCode: 'ES',
        language: 'es',
        timeZone: 'Europe/Madrid',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy'
      },
      'IT': {
        countryCode: 'IT',
        language: 'it',
        timeZone: 'Europe/Rome',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy'
      },
      'JP': {
        countryCode: 'JP',
        language: 'ja',
        timeZone: 'Asia/Tokyo',
        currency: 'JPY',
        dateFormat: 'yyyy/MM/dd'
      }
    };

    return preferences[countryCode] || preferences['US'];
  }

  /**
   * Get region-specific activity categories and suggestions
   */
  getRegionalContent(countryCode: string): RegionalContent {
    const content: Record<string, RegionalContent> = {
      'US': {
        categories: ['Baseball Games', 'BBQ & Grilling', 'National Parks', 'Music Festivals', 'Food Trucks'],
        featuredActivities: ['Hiking in National Parks', 'Beach Volleyball', 'Food Tours', 'Concerts'],
        culturalEvents: ['4th of July Celebrations', 'Thanksgiving Gatherings', 'Super Bowl Parties'],
        seasonalSuggestions: ['Summer: Beach Activities', 'Fall: Pumpkin Picking', 'Winter: Ice Skating', 'Spring: Cherry Blossoms']
      },
      'GB': {
        categories: ['Pub Quizzes', 'Football Matches', 'Tea & Scones', 'Garden Parties', 'Museum Visits'],
        featuredActivities: ['London Walking Tours', 'Countryside Hikes', 'Pub Crawls', 'Theater Shows'],
        culturalEvents: ['Bonfire Night', 'Christmas Markets', 'Royal Events', 'Edinburgh Festival'],
        seasonalSuggestions: ['Summer: Garden Parties', 'Autumn: Countryside Walks', 'Winter: Christmas Markets', 'Spring: Flower Shows']
      },
      'DE': {
        categories: ['Beer Gardens', 'Christmas Markets', 'Hiking Trails', 'Art Museums', 'Tech Meetups'],
        featuredActivities: ['Oktoberfest Celebrations', 'Black Forest Hikes', 'River Cruises', 'Castle Tours'],
        culturalEvents: ['Oktoberfest', 'Christmas Markets', 'Karneval', 'May Day Celebrations'],
        seasonalSuggestions: ['Summer: Beer Gardens', 'Autumn: Wine Festivals', 'Winter: Christmas Markets', 'Spring: Easter Markets']
      },
      'FR': {
        categories: ['Wine Tastings', 'Art Galleries', 'Café Culture', 'Farmers Markets', 'Fashion Events'],
        featuredActivities: ['Seine River Walks', 'Vineyard Tours', 'Cooking Classes', 'Art Museum Visits'],
        culturalEvents: ['Bastille Day', 'Festival de Cannes', 'Paris Fashion Week', 'Beaujolais Nouveau'],
        seasonalSuggestions: ['Summer: Outdoor Cafés', 'Autumn: Wine Harvest', 'Winter: Alpine Skiing', 'Spring: Garden Tours']
      },
      'ES': {
        categories: ['Tapas Tours', 'Flamenco Shows', 'Beach Activities', 'Siesta Culture', 'Football Matches'],
        featuredActivities: ['Camino Walks', 'Paella Cooking', 'Beach Volleyball', 'Art Museum Tours'],
        culturalEvents: ['La Tomatina', 'Running of Bulls', 'Semana Santa', 'Three Kings Day'],
        seasonalSuggestions: ['Summer: Beach Time', 'Autumn: Harvest Festivals', 'Winter: Indoor Tapas', 'Spring: Outdoor Markets']
      },
      'JP': {
        categories: ['Cherry Blossom Viewing', 'Tea Ceremonies', 'Manga Culture', 'Karaoke', 'Temple Visits'],
        featuredActivities: ['Hanami Parties', 'Onsen Visits', 'Sushi Making', 'Traditional Crafts'],
        culturalEvents: ['Cherry Blossom Season', 'Golden Week', 'Obon Festival', 'New Year Celebrations'],
        seasonalSuggestions: ['Spring: Hanami', 'Summer: Festivals', 'Autumn: Maple Viewing', 'Winter: Hot Springs']
      }
    };

    return content[countryCode] || content['US'];
  }

  /**
   * Filter events based on user's region and preferences
   */
  async getRegionalizedEvents(countryCode: string, limit: number = 20) {
    try {
      const regionalContent = this.getRegionalContent(countryCode);
      
      // Get events that match regional categories
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .in('category', regionalContent.categories)
        .eq('status', 'active')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching regionalized events:', error);
        return [];
      }

      return events || [];
    } catch (error) {
      console.error('Error in getRegionalizedEvents:', error);
      return [];
    }
  }

  /**
   * Get currency formatting for regional prices
   */
  formatPrice(amount: number, countryCode: string): string {
    const preferences = this.getRegionalPreferences(countryCode);
    
    try {
      return new Intl.NumberFormat(preferences.language, {
        style: 'currency',
        currency: preferences.currency
      }).format(amount);
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Format date according to regional preferences
   */
  formatDate(date: Date, countryCode: string): string {
    const preferences = this.getRegionalPreferences(countryCode);
    
    try {
      return new Intl.DateTimeFormat(preferences.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get suggested activities based on current season and region
   */
  getSeasonalSuggestions(countryCode: string): string[] {
    const content = this.getRegionalContent(countryCode);
    const now = new Date();
    const month = now.getMonth(); // 0-11
    
    // Determine season based on northern/southern hemisphere
    let season: string;
    const isNorthernHemisphere = !['AU', 'NZ', 'ZA', 'AR', 'CL'].includes(countryCode);
    
    if (isNorthernHemisphere) {
      if (month >= 2 && month <= 4) season = 'Spring';
      else if (month >= 5 && month <= 7) season = 'Summer';
      else if (month >= 8 && month <= 10) season = 'Autumn';
      else season = 'Winter';
    } else {
      if (month >= 2 && month <= 4) season = 'Autumn';
      else if (month >= 5 && month <= 7) season = 'Winter';
      else if (month >= 8 && month <= 10) season = 'Spring';
      else season = 'Summer';
    }

    return content.seasonalSuggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(season.toLowerCase())
    );
  }

  /**
   * Get trending activities by region
   */
  async getTrendingActivitiesByRegion(countryCode: string): Promise<string[]> {
    try {
      const regionalContent = this.getRegionalContent(countryCode);
      
      // Get most popular categories in this region
      const { data: trendingEvents } = await supabase
        .from('events')
        .select('category')
        .in('category', regionalContent.categories)
        .eq('status', 'active')
        .gte('date', new Date().toISOString().split('T')[0]);

      if (trendingEvents) {
        // Count occurrences of each category
        const categoryCounts = trendingEvents.reduce((acc: Record<string, number>, event) => {
          if (event.category) {
            acc[event.category] = (acc[event.category] || 0) + 1;
          }
          return acc;
        }, {});

        // Sort by count and return top categories
        return Object.entries(categoryCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([category]) => category);
      }

      return regionalContent.categories.slice(0, 5);
    } catch (error) {
      console.error('Error getting trending activities:', error);
      return this.getRegionalContent(countryCode).categories.slice(0, 5);
    }
  }
}

export const regionalizationService = new RegionalizationService();