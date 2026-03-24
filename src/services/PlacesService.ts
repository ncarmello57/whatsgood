import { FOURSQUARE_API_KEY } from '../config';

export interface PlaceResult {
  fsqId: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  phone?: string;
  website?: string;
  cuisine?: string;
  category?: string;
  distance?: number;
}

const FSQ_BASE = 'https://places-api.foursquare.com/places';
const FSQ_HEADERS = {
  Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
  Accept: 'application/json',
  'X-Places-Api-Version': '2025-06-17',
};

// Food & drink parent category covers restaurants, cafes, bars, etc.
const FOOD_CATEGORY = '13000';

const FOOD_KEYWORDS = [
  'restaurant', 'café', 'cafe', 'coffee', 'tea', 'bar', 'pub', 'brewery',
  'winery', 'bakery', 'deli', 'diner', 'bistro', 'pizza', 'burger', 'taco',
  'bbq', 'grill', 'buffet', 'seafood', 'steakhouse', 'noodle', 'ramen',
  'sushi', 'fast food', 'food', 'sandwich', 'donut', 'bagel', 'ice cream',
  'dessert', 'juice', 'smoothie', 'boba', 'brunch', 'breakfast', 'lunch',
  'dinner', 'eatery', 'kitchen', 'gastropub', 'taproom', 'cantina', 'trattoria',
  'grocery', 'supermarket', 'market', 'bodega', 'food hall', 'food truck',
  'wings', 'chicken', 'chinese', 'japanese', 'thai', 'indian', 'mexican',
  'italian', 'greek', 'french', 'korean', 'vietnamese', 'mediterranean',
];

function isFoodPlace(categories: any[]): boolean {
  if (!categories?.length) return false;
  return categories.some((c: any) =>
    FOOD_KEYWORDS.some(keyword =>
      c.name?.toLowerCase().includes(keyword)
    )
  );
}

export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WhatsGoodApp/1.0' },
  });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

export async function searchNearbyRestaurants(
  lat: number,
  lon: number,
  radiusMeters = 1500,
  keyword = ''
): Promise<PlaceResult[]> {
  let url =
    `${FSQ_BASE}/search` +
    `?ll=${lat},${lon}` +
    `&radius=${radiusMeters}` +
    `&categories=${FOOD_CATEGORY}` +
    `&limit=50`;
  if (keyword.trim()) {
    url += `&query=${encodeURIComponent(keyword.trim())}`;
  }

  const res = await fetch(url, { headers: FSQ_HEADERS });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Foursquare ${res.status}: ${body}`);
  }

  const data = await res.json();
  if (__DEV__ && data.results?.[0]) {
    console.log('FSQ sample result:', JSON.stringify(data.results[0], null, 2));
  }
  return (data.results as any[])
    .filter((place: any) => isFoodPlace(place.categories))
    .map(mapResult)
    .filter((p) => p.lat !== 0 || p.lon !== 0);
}

function mapResult(place: any): PlaceResult {
  const loc = place.location ?? {};
  const address = loc.formatted_address ?? [
    loc.address,
    loc.locality,
    loc.region,
    loc.postcode,
  ].filter(Boolean).join(', ');

  const primaryCategory = place.categories?.[0];
  const category = primaryCategory?.name ?? 'Restaurant';

  // Foursquare cuisine comes from subcategory names — use all category names joined
  const allCategories: string[] = (place.categories ?? []).map((c: any) => c.name);
  const cuisine = allCategories.length > 1 ? allCategories.slice(1).join(', ') : undefined;

  return {
    fsqId: place.fsq_place_id ?? place.fsq_id,
    name: place.name,
    lat: place.latitude ?? 0,
    lon: place.longitude ?? 0,
    address: address || undefined,
    phone: place.tel,
    website: place.website,
    cuisine,
    category,
    distance: place.distance,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
