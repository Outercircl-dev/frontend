
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMembership } from '@/components/OptimizedProviders';

import { toast } from '@/components/ui/use-toast';
import { EventData } from '@/components/ActivityCard';
import { CapacityFilterType } from './CapacityFilter';

export interface DashboardState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dateFilter: string | null;
  setDateFilter: (filter: string | null) => void;
  categoryFilters: string[];
  setCategoryFilters: (filters: string[]) => void;
  capacityFilter: CapacityFilterType;
  setCapacityFilter: (filter: CapacityFilterType) => void;
  showBackToTop: boolean;
  setShowBackToTop: (show: boolean) => void;
  showSuggestedEvents: boolean;
  setShowSuggestedEvents: (show: boolean) => void;
  suggestedEvents: EventData[];
  setSuggestedEvents: (events: EventData[]) => void;
  pinnedEventIds: string[];
  setPinnedEventIds: (ids: string[]) => void;
  showFriendsActivities: boolean;
  setShowFriendsActivities: (show: boolean) => void;
  hasNotifications: boolean;
  setHasNotifications: (has: boolean) => void;
  events: EventData[];
  setEvents: (events: EventData[]) => void;
}

interface DashboardContainerProps {
  children: (state: DashboardState) => React.ReactNode;
}

const DashboardContainer: React.FC<DashboardContainerProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilterType>('all');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showSuggestedEvents, setShowSuggestedEvents] = useState(false);
  const [suggestedEvents, setSuggestedEvents] = useState<EventData[]>([]);
  const [pinnedEventIds, setPinnedEventIds] = useState<string[]>([]);
  const [showFriendsActivities, setShowFriendsActivities] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);

  // Update search query when URL params change
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search');
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }
  }, [searchParams]);

  // Remove auth management - let AppContext handle this

  // Load pinned events from localStorage with memoization
  useEffect(() => {
    const getSavedEvents = (): string[] => {
      try {
        const savedEvents = localStorage.getItem('pinnedEvents');
        return savedEvents ? JSON.parse(savedEvents) : [];
      } catch {
        return [];
      }
    };
    
    const savedEvents = getSavedEvents();
    setPinnedEventIds(savedEvents);
  }, []);

  // Optimized scroll handler with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowBackToTop(window.scrollY > 300);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const state: DashboardState = {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    dateFilter,
    setDateFilter,
    categoryFilters,
    setCategoryFilters,
    capacityFilter,
    setCapacityFilter,
    showBackToTop,
    setShowBackToTop,
    showSuggestedEvents,
    setShowSuggestedEvents,
    suggestedEvents,
    setSuggestedEvents,
    pinnedEventIds,
    setPinnedEventIds,
    showFriendsActivities,
    setShowFriendsActivities,
    hasNotifications,
    setHasNotifications,
    events,
    setEvents,
  };

  return <>{children(state)}</>;
};

export default React.memo(DashboardContainer);
