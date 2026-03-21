import { type Region } from "@/components/OptimizedProviders";

/**
 * Maps ISO country codes to our Region type for pricing
 * Defaults to 'us' for unmapped countries
 */
export function mapCountryToRegion(countryCode: string): Region {
  const code = countryCode.toUpperCase();
  
  // United Kingdom
  if (code === 'GB' || code === 'UK') {
    return 'uk';
  }
  
  // European Union and European countries
  const euCountries = [
    'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'NO', 
    'PL', 'PT', 'IE', 'GR', 'CZ', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI',
    'LT', 'LV', 'EE', 'CY', 'MT', 'LU', 'IS', 'CH'
  ];
  if (euCountries.includes(code)) {
    return 'eu';
  }
  
  // Canada
  if (code === 'CA') {
    return 'ca';
  }
  
  // Australia and New Zealand
  if (code === 'AU' || code === 'NZ') {
    return 'au';
  }
  
  // Japan
  if (code === 'JP') {
    return 'jp';
  }
  
  // India
  if (code === 'IN') {
    return 'in';
  }
  
  // United States and all others default to US pricing
  return 'us';
}
