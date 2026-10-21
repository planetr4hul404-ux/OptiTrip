// lib/maps.ts - Geocoding (Nominatim) & Routing (OSRM demo server)
// Follows OSM usage policies (custom User-Agent, browser client requests)

export interface Coordinates {
  lat: number;
  lon: number;
  displayName?: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  isFallback?: boolean;
  sourceNote: string;
  geometry?: [number, number][];
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
}

export async function reverseGeocodeLocation(coordinates: Coordinates): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lon}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocoding HTTP ${response.status}`);
    }

    const data = await response.json();
    if (typeof data.display_name !== 'string' || !data.display_name.trim()) {
      throw new Error('No readable address found for the selected map point.');
    }

    return data.display_name;
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
    throw new Error('Could not identify that map point. The coordinates were kept.');
  }
}

// Prepared Pune Demonstration Fallback Routes (When live APIs are unreachable or for fast 1-click testing)
export const PREPARED_ROUTES = [
  {
    name: 'Pune Station ➔ Swargate Bus Stand',
    originText: 'Pune Railway Station',
    destText: 'Swargate Bus Stand, Pune',
    originCoords: { lat: 18.5289, lon: 73.8744 },
    destCoords: { lat: 18.5018, lon: 73.8586 },
    walk: { distanceKm: 4.9, durationMin: 62 },
    drive: { distanceKm: 5.4, durationMin: 18 },
  },
  {
    name: 'Shivajinagar ➔ Hinjewadi Phase 1',
    originText: 'Shivajinagar Station, Pune',
    destText: 'Hinjewadi Phase 1, Pune',
    originCoords: { lat: 18.5314, lon: 73.8446 },
    destCoords: { lat: 18.5913, lon: 73.7389 },
    walk: { distanceKm: 16.5, durationMin: 210 },
    drive: { distanceKm: 15.8, durationMin: 38 },
  },
  {
    name: 'Kothrud ➔ Viman Nagar',
    originText: 'Kothrud Bus Stand, Pune',
    destText: 'Viman Nagar, Pune',
    originCoords: { lat: 18.5074, lon: 73.8077 },
    destCoords: { lat: 18.5679, lon: 73.9143 },
    walk: { distanceKm: 14.8, durationMin: 185 },
    drive: { distanceKm: 14.2, durationMin: 36 },
  },
];

/**
 * Search locations using Nominatim OpenStreetMap API
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Append Pune, Maharashtra to bias local results if not specified
  const searchQuery = trimmed.toLowerCase().includes('pune') ? trimmed : `${trimmed}, Pune`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    searchQuery
  )}&limit=5&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (err) {
    console.warn('Geocoding error:', err);
    throw new Error('Location lookup failed. Check your network or pick a prepared route.');
  }
}

/**
 * Fetch road route distance and baseline duration from public OSRM demo server
 */
export async function fetchOsrmRoute(
  origin: Coordinates,
  destination: Coordinates,
  profile: 'driving' | 'walking' = 'driving'
): Promise<RouteResult> {
  const coordinatesString = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinatesString}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM service HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      throw new Error(json.message || 'No route found between coordinates');
    }

    const route = json.routes[0];
    const distanceKm = Number((route.distance / 1000).toFixed(2));
    const durationMin = Number((route.duration / 60).toFixed(1));
    const geometry =
      route.geometry?.type === 'LineString' &&
      Array.isArray(route.geometry.coordinates)
        ? route.geometry.coordinates
            .filter(
              (point: unknown): point is [number, number] =>
                Array.isArray(point) &&
                point.length >= 2 &&
                typeof point[0] === 'number' &&
                typeof point[1] === 'number'
            )
            .map(([lon, lat]: [number, number]) => [lat, lon] as [number, number])
        : undefined;

    return {
      distanceKm,
      durationMin,
      isFallback: false,
      sourceNote: `OSRM public demo router (${profile})`,
      geometry,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn(`OSRM ${profile} request failed:`, err);
    throw new Error(`Routing service unavailable. Use a prepared sample route.`);
  }
}
