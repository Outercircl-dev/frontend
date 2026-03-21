
import React, { createContext, useContext, useState } from 'react';

export interface FormData {
  title: string;
  description: string;
  location: string;
  meetupSpot: string;
  time: string;
  duration: string;
  maxAttendees: string | null;
  approvalRequired: boolean;
  autoConfirm: boolean;
  eventImage: string;
  genderPreference: 'male' | 'female' | 'no_preference';
  isRecurring: boolean;
  recurringType: 'standard' | 'premium';
  recurrencePattern: string;
  recurrenceInterval: number;
  recurrenceEndDate: Date | undefined;
  recurrenceEndCount: number | undefined;
}

interface EventFormContextType {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  categories: string[];
  setCategories: (categories: string[]) => void;
  coordinates: [number, number] | null;
  setCoordinates: (coordinates: [number, number] | null) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSwitchChange: (name: string, checked: boolean | string) => void;
  handleImageSelected: (imageUrl: string) => void;
  handleLocationChange: (newCoordinates: [number, number]) => void;
  handlePatternChange: (value: string) => void;
  handleEndDateChange: (date: Date | undefined) => void;
}

const EventFormContext = createContext<EventFormContextType | undefined>(undefined);

export const useEventForm = () => {
  const context = useContext(EventFormContext);
  if (!context) {
    // Enhanced error logging and fallback
    console.warn('⚠️ useEventForm called outside of EventFormProvider - this indicates a context initialization issue');
    console.warn('Current location:', window.location.pathname);
    console.warn('Provider availability:', !!EventFormContext);
    
    // Provide comprehensive fallback to prevent crashes
    const fallbackContext = {
      formData: {
        title: '', description: '', location: '', meetupSpot: '', time: '', duration: '',
        maxAttendees: '4', approvalRequired: false, autoConfirm: true, eventImage: '',
        genderPreference: 'no_preference' as const,
        isRecurring: false, recurringType: 'standard' as const, recurrencePattern: 'weekly',
        recurrenceInterval: 1, recurrenceEndDate: undefined, recurrenceEndCount: undefined,
      },
      setFormData: () => console.warn('Fallback setFormData called - context not available'),
      date: undefined,
      setDate: () => console.warn('Fallback setDate called - context not available'),
      categories: ['social'],
      setCategories: () => console.warn('Fallback setCategories called - context not available'),
      coordinates: null,
      setCoordinates: () => console.warn('Fallback setCoordinates called - context not available'),
      handleInputChange: () => console.warn('Fallback handleInputChange called - context not available'),
      handleSwitchChange: () => console.warn('Fallback handleSwitchChange called - context not available'),
      handleImageSelected: () => console.warn('Fallback handleImageSelected called - context not available'),
      handleLocationChange: () => console.warn('Fallback handleLocationChange called - context not available'),
      handlePatternChange: () => console.warn('Fallback handlePatternChange called - context not available'),
      handleEndDateChange: () => console.warn('Fallback handleEndDateChange called - context not available'),
    };
    
    return fallbackContext;
  }
  return context;
};

interface EventFormProviderProps {
  children: React.ReactNode;
}

export const EventFormProvider: React.FC<EventFormProviderProps> = ({ children }) => {
  console.log('🔄 EventFormProvider initializing...');
  
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    location: '',
    meetupSpot: '',
    time: '',
    duration: '',
    maxAttendees: '4',
    approvalRequired: false,
    autoConfirm: true,
    eventImage: '',
    genderPreference: 'no_preference',
    isRecurring: false,
    recurringType: 'standard',
    recurrencePattern: 'weekly',
    recurrenceInterval: 1,
    recurrenceEndDate: undefined,
    recurrenceEndCount: undefined,
  });
  const [categories, setCategories] = useState<string[]>(['social']);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  console.log('✅ EventFormProvider state initialized successfully');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean | string) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleImageSelected = (imageUrl: string) => {
    setFormData((prev) => ({ ...prev, eventImage: imageUrl }));
  };

  const handleLocationChange = (newCoordinates: [number, number]) => {
    setCoordinates(newCoordinates);
    console.log('New coordinates:', newCoordinates);
  };

  const handlePatternChange = (value: string) => {
    setFormData((prev) => ({ ...prev, recurrencePattern: value }));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, recurrenceEndDate: date }));
  };

  const value = {
    formData,
    setFormData,
    date,
    setDate,
    categories,
    setCategories,
    coordinates,
    setCoordinates,
    handleInputChange,
    handleSwitchChange,
    handleImageSelected,
    handleLocationChange,
    handlePatternChange,
    handleEndDateChange,
  };

  console.log('🎯 EventFormProvider rendering with context value');

  return (
    <EventFormContext.Provider value={value}>
      {children}
    </EventFormContext.Provider>
  );
};
