
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Region } from "@/components/OptimizedProviders" 

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

// Map region to its corresponding default language
export function getDefaultLanguageByRegion(region: Region): string {
  switch (region) {
    case 'us':
      return 'en-US';
    case 'uk':
      return 'en-GB';
    case 'ca':
      return 'en-CA';
    case 'au':
      return 'en-AU';
    case 'jp':
      return 'ja';
    case 'in':
      return 'hi';
    case 'eu':
      // Default to general European language
      return 'en-GB'; 
    default:
      return 'en-US';
  }
}
