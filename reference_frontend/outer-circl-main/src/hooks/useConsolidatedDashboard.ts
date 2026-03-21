import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useUnifiedDashboard } from './useUnifiedDashboard';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  attendees: any[];
  saved_by: any[];
  created_by: string;
  category: string;
  image_url?: string;
}

interface UseConsolidatedDashboardReturn {
  events: Event[];
  savedEventIds: Set<string>;
  isLoading: boolean;
  isInitialLoading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  handleAttendClick: (eventId: string) => Promise<void>;
  handleSaveClick: (eventId: string) => Promise<void>;
}

export const useConsolidatedDashboard = (userId: string): UseConsolidatedDashboardReturn => {
  // Use the existing unified dashboard hook for safe data loading
  const {
    events: unifiedEvents,
    savedEventIds: unifiedSavedIds,
    isLoading,
    isInitialLoading,
    error,
    refreshEvents,
    handleAttendClick,
    handleSaveClick
  } = useUnifiedDashboard(userId);

  // Transform unified events to consolidated format
  const events: Event[] = unifiedEvents.map(event => {
    // Create a mock array with the correct length to represent attendees
    const attendeesArray = new Array(event.attendees || 0).fill(null);
    
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      capacity: event.maxAttendees,
      attendees: attendeesArray, // Array with correct length for .length checks
      saved_by: [], // Will be populated by saved data
      created_by: event.hostId,
      category: event.categories[0] || 'other',
      image_url: event.imageUrl
    };
  });

  // Transform saved IDs to Set format
  const savedEventIds = new Set(unifiedSavedIds);

  return {
    events,
    savedEventIds,
    isLoading,
    isInitialLoading,
    error,
    refreshEvents,
    handleAttendClick: (eventId: string) => handleAttendClick(eventId),
    handleSaveClick: (eventId: string) => handleSaveClick(eventId, !savedEventIds.has(eventId))
  };
};

// Export for backward compatibility
export type OptimizedEventData = Event;