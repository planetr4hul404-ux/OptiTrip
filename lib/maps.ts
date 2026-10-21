// lib/maps.ts - Geocoding (Nominatim) & Routing (OSRM demo server)
// Person B: Maps & Routing Module for OptiTrip
// Complies with OSM Usage Policy (User-Agent header, client-side requests, rate consideration)
// Follows README §4 Data Honesty & Calculation Rules

export interface Coordinates {
  lat: number;
  lon: number;
  displayName?: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry?: [number, number][]; // [latitude, longitude] pairs for Leaflet Polyline
  isFallback: boolean;
  sourceNote: string;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
}

export interface PreparedRoute {
  id: string;
  name: string;
  originText: string;
  destText: string;
  originCoords: Coordinates;
  destCoords: Coordinates;
  walk: { distanceKm: number; durationMin: number };
  drive: { distanceKm: number; durationMin: number };
  waypoints: [number, number][]; // Pre-calculated road geometry for Leaflet map display
}

// ============================================================================
// Prepared Pune Benchmark Demonstration Routes (README §2, §4, §8)
// Guaranteed reliable fallback routes when public demo APIs are unreachable
// ============================================================================
export const PREPARED_ROUTES: PreparedRoute[] = [
  {
    id: 'pune-station-swargate',
    name: 'Pune Station ➔ Swargate Bus Stand',
    originText: 'Pune Railway Station',
    destText: 'Swargate Bus Stand, Pune',
    originCoords: { lat: 18.5289, lon: 73.8744 },
    destCoords: { lat: 18.5018, lon: 73.8586 },
    walk: { distanceKm: 4.9, durationMin: 62 },
    drive: { distanceKm: 5.4, durationMin: 18 },
    waypoints: [
      [18.5289, 73.8744], // Pune Railway Station
      [18.5255, 73.8722], // Sassoon Hospital Chowk
      [18.5218, 73.8695], // Narpatgiri Chowk / Ambedkar Statue
      [18.5172, 73.8654], // Nana Peth
      [18.5115, 73.8618], // Bhavani Peth
      [18.5058, 73.8596], // Jedhe Chowk
      [18.5018, 73.8586], // Swargate Bus Stand
    ],
  },
  {
    id: 'shivajinagar-hinjewadi',
    name: 'Shivajinagar ➔ Hinjewadi Phase 1',
    originText: 'Shivajinagar Station, Pune',
    destText: 'Hinjewadi Phase 1, Pune',
    originCoords: { lat: 18.5314, lon: 73.8446 },
    destCoords: { lat: 18.5913, lon: 73.7389 },
    walk: { distanceKm: 16.5, durationMin: 210 },
    drive: { distanceKm: 15.8, durationMin: 38 },
    waypoints: [
      [18.5314, 73.8446], // Shivajinagar
      [18.5412, 73.8341], // Agricultural College / Range Hills
      [18.5529, 73.8262], // Pune University Circle (Ganeshkhind)
      [18.5626, 73.8087], // Aundh (Spicer Chowk / Parihar Chowk)
      [18.5670, 73.7915], // Jagtap Dairy / Aundh-Ravet BRTS link
      [18.5785, 73.7712], // Wakad Bridge
      [18.5920, 73.7540], // Bhumkar Chowk / Hinjewadi Flyover
      [18.5913, 73.7389], // Hinjewadi Phase 1 Shivaji Chowk
    ],
  },
  {
    id: 'kothrud-viman-nagar',
    name: 'Kothrud ➔ Viman Nagar',
    originText: 'Kothrud Bus Stand, Pune',
    destText: 'Viman Nagar, Pune',
    originCoords: { lat: 18.5074, lon: 73.8077 },
    destCoords: { lat: 18.5679, lon: 73.9143 },
    walk: { distanceKm: 14.8, durationMin: 185 },
    drive: { distanceKm: 14.2, durationMin: 36 },
    waypoints: [
      [18.5074, 73.8077], // Kothrud Stand
      [18.5065, 73.8322], // Nal Stop / Karve Road
      [18.5173, 73.8415], // Deccan Gymkhana / Sambhaji Bridge
      [18.5293, 73.8565], // COEP / Sancheti Chowk
      [18.5350, 73.8820], // Bund Garden / Sangamwadi
      [18.5530, 73.8900], // Yerawada (Gunjan Chowk)
      [18.5615, 73.9050], // Shastri Nagar / Ahmednagar Road
      [18.5679, 73.9143], // Viman Nagar (Phoenix Mall junction)
    ],
  },
];

// Curated Pune transit nodes & landmarks for instant offline lookup and search biasing
export const PUNE_LANDMARKS: Record<string, Coordinates> = {
  'pune railway station': { lat: 18.5289, lon: 73.8744, displayName: 'Pune Railway Station, Agarkar Nagar, Pune' },
  'swargate': { lat: 18.5018, lon: 73.8586, displayName: 'Swargate Bus Stand, Jedhe Chowk, Pune' },
  'swargate bus stand': { lat: 18.5018, lon: 73.8586, displayName: 'Swargate Bus Stand, Jedhe Chowk, Pune' },
  'shivajinagar': { lat: 18.5314, lon: 73.8446, displayName: 'Shivajinagar Station, Pune' },
  'shivajinagar station': { lat: 18.5314, lon: 73.8446, displayName: 'Shivajinagar Station, Pune' },
  'hinjewadi': { lat: 18.5913, lon: 73.7389, displayName: 'Hinjewadi Phase 1, Rajiv Gandhi Infotech Park, Pune' },
  'hinjewadi phase 1': { lat: 18.5913, lon: 73.7389, displayName: 'Hinjewadi Phase 1, Rajiv Gandhi Infotech Park, Pune' },
  'hinjewadi phase 2': { lat: 18.5835, lon: 73.7155, displayName: 'Hinjewadi Phase 2 (Wipro Circle), Pune' },
  'hinjewadi phase 3': { lat: 18.5752, lon: 73.6930, displayName: 'Hinjewadi Phase 3 (Megapolis), Pune' },
  'kothrud': { lat: 18.5074, lon: 73.8077, displayName: 'Kothrud Bus Stand, Pune' },
  'kothrud bus stand': { lat: 18.5074, lon: 73.8077, displayName: 'Kothrud Bus Stand, Pune' },
  'viman nagar': { lat: 18.5679, lon: 73.9143, displayName: 'Viman Nagar, Pune' },
  'deccan': { lat: 18.5173, lon: 73.8415, displayName: 'Deccan Gymkhana, FC Road, Pune' },
  'deccan gymkhana': { lat: 18.5173, lon: 73.8415, displayName: 'Deccan Gymkhana, FC Road, Pune' },
  'katraj': { lat: 18.4575, lon: 73.8677, displayName: 'Katraj Bus Depot / Snake Park, Pune' },
  'hadapsar': { lat: 18.5089, lon: 73.9259, displayName: 'Hadapsar Gadital, Pune' },
  'aundh': { lat: 18.5626, lon: 73.8087, displayName: 'Aundh (Parihar Chowk), Pune' },
  'baner': { lat: 18.5590, lon: 73.7868, displayName: 'Baner High Street, Pune' },
  'wakad': { lat: 18.5987, lon: 73.7634, displayName: 'Wakad Bridge, Pune' },
  'pune airport': { lat: 18.5822, lon: 73.9197, displayName: 'Pune International Airport (PNQ), Lohegaon, Pune' },
  'coep': { lat: 18.5293, lon: 73.8565, displayName: 'COEP Technological University, Shivajinagar, Pune' },
  'college of engineering pune': { lat: 18.5293, lon: 73.8565, displayName: 'COEP Technological University, Shivajinagar, Pune' },
  'sppu': { lat: 18.5529, lon: 73.8262, displayName: 'Savitribai Phule Pune University (SPPU), Ganeshkhind, Pune' },
  'pune university': { lat: 18.5529, lon: 73.8262, displayName: 'Savitribai Phule Pune University (SPPU), Ganeshkhind, Pune' },
  'magarpatta': { lat: 18.5158, lon: 73.9272, displayName: 'Magarpatta City (Cybercity), Hadapsar, Pune' },
  'kalyani nagar': { lat: 18.5463, lon: 73.9034, displayName: 'Kalyani Nagar, Pune' },
};

/**
 * Autocomplete / suggestion helper for quick landmark selection
 */
export function getPuneLandmarkSuggestions(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return [];

  const matches = Object.values(PUNE_LANDMARKS)
    .filter((landmark) => landmark.displayName?.toLowerCase().includes(trimmed))
    .map((landmark) => landmark.displayName || '')
    .filter(Boolean);

  return Array.from(new Set(matches)).slice(0, 5);
}

/**
 * Calculates straight-line Haversine distance between two coordinates in kilometers
 */
export function calculateHaversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLon = ((c2.lon - c1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Search locations using Nominatim OpenStreetMap API with local Pune fallback cache
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Check known Pune landmarks cache first for instant response
  const lowerQuery = trimmed.toLowerCase();
  for (const [key, landmark] of Object.entries(PUNE_LANDMARKS)) {
    if (lowerQuery === key || lowerQuery.includes(key) || key.includes(lowerQuery)) {
      return [
        {
          displayName: landmark.displayName || trimmed,
          lat: landmark.lat,
          lon: landmark.lon,
        },
      ];
    }
  }

  // Append Pune, Maharashtra to bias local search if not specified
  const searchQuery = lowerQuery.includes('pune') ? trimmed : `${trimmed}, Pune, Maharashtra`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    searchQuery
  )}&limit=5&addressdetails=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OptiTrip-College-Demo/1.0 (Pune Transit Optimizer)',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item: { display_name: string; lat: string; lon: string }) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    }

    // If Nominatim returns no items, try searching partial landmark names
    const fallbackLandmark = Object.values(PUNE_LANDMARKS).find((lm) =>
      lm.displayName?.toLowerCase().includes(lowerQuery)
    );
    if (fallbackLandmark) {
      return [
        {
          displayName: fallbackLandmark.displayName || trimmed,
          lat: fallbackLandmark.lat,
          lon: fallbackLandmark.lon,
        },
      ];
    }

    return [];
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Geocoding service unavailable or timed out:', err);

    // Gracefully check Pune landmark directory
    const fallbackLandmark = Object.values(PUNE_LANDMARKS).find((lm) =>
      lm.displayName?.toLowerCase().includes(lowerQuery)
    );
    if (fallbackLandmark) {
      return [
        {
          displayName: fallbackLandmark.displayName || trimmed,
          lat: fallbackLandmark.lat,
          lon: fallbackLandmark.lon,
        },
      ];
    }

    throw new Error(
      `Location lookup failed for "${trimmed}". Check your connection or pick a Prepared Pune Route.`
    );
  }
}

/**
 * Fetch road route distance, baseline duration, and geometry from public OSRM demo server
 * Requests GeoJSON geometry to support interactive polyline rendering on Leaflet
 */
export async function fetchOsrmRoute(
  origin: Coordinates,
  destination: Coordinates,
  profile: 'driving' | 'walking' = 'driving'
): Promise<RouteResult> {
  const coordinatesString = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  // Request full GeoJSON geometries so Leaflet can draw the route polyline
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinatesString}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5s timeout

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

    // OSRM GeoJSON returns [lon, lat]; convert to Leaflet's expected [lat, lon]
    const geometry: [number, number][] =
      route.geometry?.coordinates?.map((coord: [number, number]) => [coord[1], coord[0]]) || [];

    return {
      distanceKm,
      durationMin,
      geometry,
      isFallback: false,
      sourceNote: profile === 'driving' ? 'Route estimate (OSRM)' : 'Walking route estimate (OSRM)',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn(`OSRM ${profile} request failed:`, err);
    throw new Error(`Routing service unavailable. Use a prepared sample route.`);
  }
}



/**
 * Create a transparent, clearly labelled fallback route when OSRM routing is unavailable
 * Complies with README §4: "never quietly present the sample as live data"
 */
export function createFallbackRoute(
  origin: Coordinates,
  destination: Coordinates,
  originText: string = '',
  destText: string = ''
): { drive: RouteResult; walk: RouteResult; isPresetMatch: boolean } {
  // 1. Check if the points match one of our prepared benchmark routes
  const combinedText = `${originText} ${destText}`.toLowerCase();
  const matchedPreset = PREPARED_ROUTES.find((preset) => {
    const origDist = calculateHaversineDistanceKm(origin, preset.originCoords);
    const destDist = calculateHaversineDistanceKm(destination, preset.destCoords);
    return (origDist < 0.8 && destDist < 0.8) || (combinedText.includes('swargate') && combinedText.includes('station'));
  });

  if (matchedPreset) {
    return {
      isPresetMatch: true,
      drive: {
        distanceKm: matchedPreset.drive.distanceKm,
        durationMin: matchedPreset.drive.durationMin,
        geometry: matchedPreset.waypoints,
        isFallback: true,
        sourceNote: `Prepared sample fallback route: ${matchedPreset.name} (OSRM demo server offline)`,
      },
      walk: {
        distanceKm: matchedPreset.walk.distanceKm,
        durationMin: matchedPreset.walk.durationMin,
        geometry: matchedPreset.waypoints,
        isFallback: true,
        sourceNote: `Prepared sample fallback route (Walking)`,
      },
    };
  }

  // 2. Generic fallback calculated via Haversine with Pune urban tortuosity multiplier (~1.3x)
  const straightLineKm = calculateHaversineDistanceKm(origin, destination);
  const roadDistKm = Number(Math.max(0.5, straightLineKm * 1.3).toFixed(2));
  // Average Pune road speed ~22 km/h; walking ~5 km/h
  const roadMin = Number(Math.max(3, (roadDistKm / 22) * 60).toFixed(1));
  const walkMin = Number(Math.max(5, (roadDistKm / 5) * 60).toFixed(1));

  // Generate 2-point geometry connecting origin & destination
  const geometry: [number, number][] = [
    [origin.lat, origin.lon],
    [destination.lat, destination.lon],
  ];

  return {
    isPresetMatch: false,
    drive: {
      distanceKm: roadDistKm,
      durationMin: roadMin,
      geometry,
      isFallback: true,
      sourceNote: 'Prepared sample estimate: Haversine urban model (OSRM demo server unreachable)',
    },
    walk: {
      distanceKm: roadDistKm,
      durationMin: walkMin,
      geometry,
      isFallback: true,
      sourceNote: 'Prepared sample estimate: 5 km/h walking model',
    },
  };
}
