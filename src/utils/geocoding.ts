/**
 * utils/geocoding.ts
 * Robust Nominatim geocoder with Pune fallback.
 */

import L from 'leaflet';

export interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
  [key: string]: any;
}

/**
 * Always returns an array. If no results, returns [].
 * Focuses on Maharashtra locations for better accuracy.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult[]> => {
  console.log('🔍 Geocoding address:', address);
  
  // Try direct geocoding first
  let results = await geocodeWithNominatim(address);
  console.log('📍 Direct geocoding results:', results.length);
  
  // If no results and address doesn't contain Maharashtra, try with Maharashtra
  if (results.length === 0) {
    const modifiedAddress = `${address}, Maharashtra, India`;
    console.log('🔍 Trying with Maharashtra:', modifiedAddress);
    results = await geocodeWithNominatim(modifiedAddress);
    console.log('📍 Maharashtra geocoding results:', results.length);
  }

  // Filter results to ensure they're in Maharashtra
  const maharashtraResults = results.filter((result: GeocodeResult) => 
    result.display_name.toLowerCase().includes('maharashtra') ||
    result.display_name.toLowerCase().includes('mumbai') ||
    result.display_name.toLowerCase().includes('pune') ||
    result.display_name.toLowerCase().includes('nagpur') ||
    result.display_name.toLowerCase().includes('nashik') ||
    result.display_name.toLowerCase().includes('aurangabad') ||
    result.display_name.toLowerCase().includes('solapur') ||
    result.display_name.toLowerCase().includes('amravati') ||
    result.display_name.toLowerCase().includes('kolhapur') ||
    result.display_name.toLowerCase().includes('sangli') ||
    result.display_name.toLowerCase().includes('thane') ||
    result.display_name.toLowerCase().includes('nashik') ||
    result.display_name.toLowerCase().includes('jalgaon') ||
    result.display_name.toLowerCase().includes('akola') ||
    result.display_name.toLowerCase().includes('latur') ||
    result.display_name.toLowerCase().includes('ahmadnagar') ||
    result.display_name.toLowerCase().includes('ichalkaranji') ||
    result.display_name.toLowerCase().includes('jalna') ||
    result.display_name.toLowerCase().includes('bhusawal') ||
    result.display_name.toLowerCase().includes('panvel') ||
    result.display_name.toLowerCase().includes('satara') ||
    result.display_name.toLowerCase().includes('beed') ||
    result.display_name.toLowerCase().includes('yavatmal') ||
    result.display_name.toLowerCase().includes('kamptee') ||
    result.display_name.toLowerCase().includes('gondia') ||
    result.display_name.toLowerCase().includes('barsi') ||
    result.display_name.toLowerCase().includes('achalpur') ||
    result.display_name.toLowerCase().includes('osmanabad') ||
    result.display_name.toLowerCase().includes('nandurbar') ||
    result.display_name.toLowerCase().includes('wardha') ||
    result.display_name.toLowerCase().includes('udgir') ||
    result.display_name.toLowerCase().includes('aurangabad') ||
    result.display_name.toLowerCase().includes('amalner') ||
    result.display_name.toLowerCase().includes('akot') ||
    result.display_name.toLowerCase().includes('pandharpur') ||
    result.display_name.toLowerCase().includes('shirpur') ||
    result.display_name.toLowerCase().includes('parbhani') ||
    result.display_name.toLowerCase().includes('miraj') ||
    result.display_name.toLowerCase().includes('bhadravati') ||
    result.display_name.toLowerCase().includes('junnar') ||
    result.display_name.toLowerCase().includes('sillod') ||
    result.display_name.toLowerCase().includes('bhusawal') ||
    result.display_name.toLowerCase().includes('jalgaon') ||
    result.display_name.toLowerCase().includes('ambejogai') ||
    result.display_name.toLowerCase().includes('anjangaon') ||
    result.display_name.toLowerCase().includes('lonavla') ||
    result.display_name.toLowerCase().includes('shegaon') ||
    result.display_name.toLowerCase().includes('miraj') ||
    result.display_name.toLowerCase().includes('tuljapur') ||
    result.display_name.toLowerCase().includes('morshi') ||
    result.display_name.toLowerCase().includes('bhiwandi') ||
    result.display_name.toLowerCase().includes('vapi') ||
    result.display_name.toLowerCase().includes('jalna') ||
    result.display_name.toLowerCase().includes('ambad') ||
    result.display_name.toLowerCase().includes('roha') ||
    result.display_name.toLowerCase().includes('bhiwandi') ||
    result.display_name.toLowerCase().includes('badlapur') ||
    result.display_name.toLowerCase().includes('ambejogai') ||
    result.display_name.toLowerCase().includes('anjangaon') ||
    result.display_name.toLowerCase().includes('lonavla') ||
    result.display_name.toLowerCase().includes('shegaon') ||
    result.display_name.toLowerCase().includes('miraj') ||
    result.display_name.toLowerCase().includes('tuljapur') ||
    result.display_name.toLowerCase().includes('morshi') ||
    result.display_name.toLowerCase().includes('bhiwandi') ||
    result.display_name.toLowerCase().includes('vapi') ||
    result.display_name.toLowerCase().includes('jalna') ||
    result.display_name.toLowerCase().includes('ambad') ||
    result.display_name.toLowerCase().includes('roha') ||
    result.display_name.toLowerCase().includes('bhiwandi') ||
    result.display_name.toLowerCase().includes('badlapur')
  );

  return maharashtraResults;
};

/**
 * Direct Nominatim geocoding
 */
const geocodeWithNominatim = async (address: string): Promise<GeocodeResult[]> => {
  // Use direct Nominatim API instead of local server
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&countrycodes=in&state=Maharashtra&limit=10&format=json&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'RedZone-Safety-App/1.0'
      },
    });

    if (!response.ok) {
      console.error('Nominatim request failed:', response.status, response.statusText);
      return [];
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      console.error('Nominatim did not return an array:', results);
      return [];
    }

    return results;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return [];
  }
};

/**
 * Picks the best result from geocoding.
 * Returns null if none.
 */
export const geocodeClosestMatch = async (address: string): Promise<L.LatLng | null> => {
  const results = await geocodeAddress(address);

  if (results.length === 0) {
    console.warn('No valid geocoding results for:', address);
    
    // Fallback: Try to find a known location in Pune/Maharashtra
    const fallbackLocations: { [key: string]: L.LatLng } = {
      'pune': L.latLng(18.5204, 73.8567),
      'mumbai': L.latLng(19.0760, 72.8777),
      'nagpur': L.latLng(21.1458, 79.0882),
      'nashik': L.latLng(19.9975, 73.7898),
      'aurangabad': L.latLng(19.8762, 75.3433),
      'solapur': L.latLng(17.6599, 75.9064),
      'pashan': L.latLng(18.5404, 73.8007),
      'model colony': L.latLng(18.5204, 73.8567),
      'hinjewadi': L.latLng(18.5914, 73.7389),
      'koregaon park': L.latLng(18.5362, 73.8955),
      'baner': L.latLng(18.5596, 73.7804),
      'aundh': L.latLng(18.5596, 73.8073),
      'viman nagar': L.latLng(18.5689, 73.9145),
      'kharadi': L.latLng(18.5504, 73.9504),
      'wakad': L.latLng(18.5914, 73.7389),
      'hadapsar': L.latLng(18.5084, 73.8567),
      'katraj': L.latLng(18.4500, 73.8667),
      'swargate': L.latLng(18.5084, 73.8567),
      'deccan': L.latLng(18.5084, 73.8567),
      'shivajinagar': L.latLng(18.5084, 73.8567)
    };
    
    const lowerAddress = address.toLowerCase();
    for (const [key, location] of Object.entries(fallbackLocations)) {
      if (lowerAddress.includes(key)) {
        console.log('🎯 Using fallback location for:', key, location);
        return location;
      }
    }
    
    // Ultimate fallback: Pune city center
    console.log('🎯 Using ultimate fallback: Pune city center');
    return L.latLng(18.5204, 73.8567);
  }

  // Sort by importance score (higher is better)
  results.sort((a, b) => {
    const scoreA = calculateImportanceScore(a);
    const scoreB = calculateImportanceScore(b);
    return scoreB - scoreA;
  });

  const best = results[0];
  console.log('✅ Best geocoding result:', best.display_name, 'at', best.lat, best.lon);
  return L.latLng(Number(best.lat), Number(best.lon));
};

/**
 * Calculate importance score for geocoding results
 */
const calculateImportanceScore = (result: GeocodeResult): number => {
  let score = 0;
  
  // Higher score for more specific results
  if (result.type === 'house' || result.type === 'building') score += 10;
  else if (result.type === 'street') score += 8;
  else if (result.type === 'suburb' || result.type === 'neighbourhood') score += 6;
  else if (result.type === 'city' || result.type === 'town') score += 4;
  else if (result.type === 'state' || result.type === 'province') score += 2;
  else if (result.type === 'country') score += 1;
  
  // Higher score for results with more complete address info
  const displayName = result.display_name || '';
  if (displayName.includes(',')) score += 2; // More detailed address
  
  // Higher score for results with higher importance (from Nominatim)
  if (result.importance) score += result.importance * 5;
  
  return score;
};
