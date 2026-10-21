// lib/maps.test.ts - Test suite for Person B (Maps & Routing)
// Run: cmd /c "npx tsx lib/maps.test.ts"
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceKm,
  getPuneLandmarkSuggestions,
  geocodeLocation,
  createFallbackRoute,
  PREPARED_ROUTES,
  PUNE_LANDMARKS,
} from './maps';

// 1. Verify Prepared Benchmark Routes exist and have valid coordinates & waypoints
assert.equal(PREPARED_ROUTES.length, 3, 'Must provide 3 prepared benchmark routes');
for (const route of PREPARED_ROUTES) {
  assert.ok(route.name, 'Route must have a name');
  assert.ok(route.originCoords.lat > 18.4 && route.originCoords.lat < 18.7, 'Valid Pune latitude');
  assert.ok(route.originCoords.lon > 73.6 && route.originCoords.lon < 74.1, 'Valid Pune longitude');
  assert.ok(route.drive.distanceKm > 0, 'Drive distance must be > 0');
  assert.ok(route.drive.durationMin > 0, 'Drive duration must be > 0');
  assert.ok(route.waypoints.length >= 2, 'Route must have waypoints for Leaflet display');
}

// 2. Haversine distance test
const puneStation = { lat: 18.5289, lon: 73.8744 };
const swargate = { lat: 18.5018, lon: 73.8586 };
const straightLineDist = calculateHaversineDistanceKm(puneStation, swargate);
assert.ok(straightLineDist > 3.0 && straightLineDist < 4.0, `Straight line distance ~3.4km, got ${straightLineDist}`);

// 3. Landmark autocomplete suggestions test
const suggestions = getPuneLandmarkSuggestions('swar');
assert.ok(suggestions.length > 0, 'Should find Swargate suggestions');
assert.ok(suggestions.some((s) => s.toLowerCase().includes('swargate')));

// 4. Geocoding offline / instant directory lookup
async function testGeocoding() {
  const stationResults = await geocodeLocation('Pune Railway Station');
  assert.ok(stationResults.length > 0, 'Should find Pune Railway Station in directory');
  assert.equal(stationResults[0].lat, PUNE_LANDMARKS['pune railway station'].lat);
  assert.equal(stationResults[0].lon, PUNE_LANDMARKS['pune railway station'].lon);
}

// 5. Fallback route generator test
const fallback1 = createFallbackRoute(puneStation, swargate, 'Pune Railway Station', 'Swargate Bus Stand');
assert.equal(fallback1.isPresetMatch, true, 'Should match prepared benchmark preset');
assert.equal(fallback1.drive.isFallback, true, 'Fallback must be explicitly flagged');
assert.ok(fallback1.drive.sourceNote.includes('Prepared sample fallback route'), 'Must include transparent source label');

// Generic custom pair fallback
const customOrigin = { lat: 18.5100, lon: 73.8200 };
const customDest = { lat: 18.5400, lon: 73.8800 };
const customFallback = createFallbackRoute(customOrigin, customDest, 'Point A', 'Point B');
assert.equal(customFallback.isPresetMatch, false);
assert.equal(customFallback.drive.isFallback, true);
assert.ok(customFallback.drive.distanceKm > 0);
assert.ok(customFallback.drive.geometry && customFallback.drive.geometry.length === 2);

testGeocoding().then(() => {
  console.log('✓ All maps and routing tests passed successfully');
});

