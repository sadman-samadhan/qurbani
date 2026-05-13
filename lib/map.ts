/**
 * Leaflet Map Configuration & Utilities
 * Using OpenStreetMap (OSM) via Nominatim API
 */

export const MAP_CONFIG = {
  defaultCenter: { lat: 23.8103, lng: 90.4125 }, // Dhaka
  defaultZoom: 13,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

const NOMINATIM_HEADERS = {
  'Accept-Language': 'bn,en',
  'User-Agent': 'QurbaniSathi/1.0 (qurbanisathi.com)',
};

/**
 * Search for an address using Nominatim
 */
export const searchAddress = async (query: string) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&countrycodes=bd&format=json&limit=5`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
};

/**
 * Reverse geocode coordinates to an address using Nominatim
 */
export const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  } catch (error) {
    console.error('Nominatim reverse geocode error:', error);
    return null;
  }
};
