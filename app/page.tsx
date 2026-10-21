'use client';

import React, { useEffect, useState } from 'react';
import {
  Compass,
  MapPin,
  ArrowRightLeft,
  Search,
  Zap,
  Wallet,
  ShieldCheck,
  SlidersHorizontal,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  Footprints,
  Bus,
  Car,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import {
  rankModes,
  deriveModeEstimates,
  Priority,
  Recommendation,
} from '@/lib/scoring';
import { istClock, timeBand } from '@/lib/availabilityModel';
import {
  geocodeLocation,
  fetchOsrmRoute,
  PREPARED_ROUTES,
  Coordinates,
} from '@/lib/maps';
import {
  logQueryAndResults,
  isSupabaseConfigured,
} from '@/lib/supabase';

export default function OptiTripPage() {
  // Input states
  const [originInput, setOriginInput] = useState('Pune Railway Station');
  const [destInput, setDestInput] = useState('Swargate Bus Stand');
  const [priority, setPriority] = useState<Priority>('balanced');

  // Route metrics state
  const [distanceKm, setDistanceKm] = useState<number>(5.4);
  const [durationMin, setDurationMin] = useState<number>(18);
  const [walkDistanceKm, setWalkDistanceKm] = useState<number>(4.9);
  const [walkDurationMin, setWalkDurationMin] = useState<number>(62);
  const [routeSource, setRouteSource] = useState<string>('Prepared Pune Benchmark Route');

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentBand, setCurrentBand] = useState('offpeak');
  const [istTimeStr, setIstTimeStr] = useState('');

  // UI status states
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    saved: boolean;
    queryId?: string;
    error?: string;
  }>({ saved: false });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const now = new Date();
      const clock = istClock(now);
      setCurrentBand(timeBand(now));
      setIstTimeStr(
        `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')} IST`
      );
      setRecommendations(
        rankModes(
          deriveModeEstimates(
            { distanceKm: 4.9, durationMin: 62 },
            { distanceKm: 5.4, durationMin: 18 }
          ),
          'balanced',
          now
        )
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Recalculate when priority changes
  function handlePriorityChange(newPriority: Priority) {
    setPriority(newPriority);
    recalculateRecommendations(distanceKm, durationMin, walkDistanceKm, walkDurationMin, newPriority);
  }

  // Core calculation helper
  function recalculateRecommendations(
    driveKm: number,
    driveMin: number,
    walkKm: number,
    walkMin: number,
    selectedPriority: Priority
  ) {
    const estimates = deriveModeEstimates(
      { distanceKm: walkKm, durationMin: walkMin },
      { distanceKm: driveKm, durationMin: driveMin }
    );
    const ranked = rankModes(estimates, selectedPriority);
    setRecommendations(ranked);
    return ranked;
  }

  // Swap locations
  function handleSwap() {
    const temp = originInput;
    setOriginInput(destInput);
    setDestInput(temp);
  }

  // Select a preset prepared route
  function handleSelectPreset(index: number) {
    const preset = PREPARED_ROUTES[index];
    setOriginInput(preset.originText);
    setDestInput(preset.destText);
    setDistanceKm(preset.drive.distanceKm);
    setDurationMin(preset.drive.durationMin);
    setWalkDistanceKm(preset.walk.distanceKm);
    setWalkDurationMin(preset.walk.durationMin);
    setRouteSource(`Prepared Pune Benchmark (${preset.name})`);
    setErrorMessage(null);

    const ranked = recalculateRecommendations(
      preset.drive.distanceKm,
      preset.drive.durationMin,
      preset.walk.distanceKm,
      preset.walk.durationMin,
      priority
    );

    // Persist to Supabase if available
    persistToSupabase(preset.originText, preset.destText, preset.drive.distanceKm, preset.drive.durationMin, priority, ranked);
  }

  // Perform route calculation (via live OSM geocoding + OSRM, or fallback)
  async function handleCalculateRoute() {
    if (!originInput.trim() || !destInput.trim()) {
      setErrorMessage('Please enter both pickup and destination locations.');
      return;
    }

    setIsCalculating(true);
    setErrorMessage(null);
    setSupabaseStatus({ saved: false });

    try {
      // 1. Geocode origin and destination
      const [originCandidates, destCandidates] = await Promise.all([
        geocodeLocation(originInput),
        geocodeLocation(destInput),
      ]);

      if (!originCandidates.length) {
        throw new Error(`Could not find location: "${originInput}". Try a nearby Pune landmark.`);
      }
      if (!destCandidates.length) {
        throw new Error(`Could not find location: "${destInput}". Try a nearby Pune landmark.`);
      }

      const originCoord: Coordinates = {
        lat: originCandidates[0].lat,
        lon: originCandidates[0].lon,
      };
      const destCoord: Coordinates = {
        lat: destCandidates[0].lat,
        lon: destCandidates[0].lon,
      };

      // 2. Fetch driving route from OSRM
      const driveRoute = await fetchOsrmRoute(originCoord, destCoord, 'driving');

      // Fetch walking route with safe fallback if foot router is unavailable
      const walkRoute = await fetchOsrmRoute(originCoord, destCoord, 'walking').catch(() => ({
        distanceKm: driveRoute.distanceKm,
        durationMin: Math.round(driveRoute.distanceKm * 12), // ~5 km/h walking speed
        sourceNote: 'Estimated walking baseline (5 km/h)',
      }));

      setDistanceKm(driveRoute.distanceKm);
      setDurationMin(driveRoute.durationMin);
      setWalkDistanceKm(walkRoute.distanceKm);
      setWalkDurationMin(walkRoute.durationMin);
      setRouteSource('Live OSRM Routing Service');

      const ranked = recalculateRecommendations(
        driveRoute.distanceKm,
        driveRoute.durationMin,
        walkRoute.distanceKm,
        walkRoute.durationMin,
        priority
      );

      // 3. Save to Supabase
      await persistToSupabase(
        originInput,
        destInput,
        driveRoute.distanceKm,
        driveRoute.durationMin,
        priority,
        ranked
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Routing lookup failed.';
      console.warn('Live routing failed, falling back to prepared baseline:', msg);
      setErrorMessage(`${msg} You can use one of the Prepared Pune routes below for a reliable demo.`);
    } finally {
      setIsCalculating(false);
    }
  }

  // Persist query & recommendations to Supabase
  async function persistToSupabase(
    orig: string,
    dest: string,
    dist: number,
    dur: number,
    prio: string,
    recs: Recommendation[]
  ) {
    if (!isSupabaseConfigured) {
      setSupabaseStatus({
        saved: false,
        error: 'Supabase credentials not configured in .env.local yet. Running in offline demo mode.',
      });
      return;
    }

    const res = await logQueryAndResults({
      originText: orig,
      destinationText: dest,
      distanceKm: dist,
      durationMin: dur,
      priority: prio,
      recommendations: recs.map((r) => ({
        mode: r.mode,
        price: r.price,
        time: r.time,
        waitMin: r.waitMin,
        availability_score: r.availability_score,
        final_score: r.final_score,
        rank: r.rank,
        why: r.why,
      })),
    });

    if (res.success) {
      setSupabaseStatus({ saved: true, queryId: res.queryId });
    } else {
      setSupabaseStatus({ saved: false, error: res.error });
    }
  }

  // Mode helpers for visuals
  function getModeIcon(mode: string) {
    switch (mode) {
      case 'bus':
        return <Bus className="w-5 h-5 text-[#44362e]" />;
      case 'auto':
        return <Zap className="w-5 h-5 text-[#44362e]" />;
      case 'cab':
        return <Car className="w-5 h-5 text-[#44362e]" />;
      case 'walk':
        return <Footprints className="w-5 h-5 text-[#44362e]" />;
      default:
        return <Compass className="w-5 h-5 text-[#44362e]" />;
    }
  }

  function getModeName(mode: string) {
    switch (mode) {
      case 'bus':
        return 'PMPML City Bus';
      case 'auto':
        return 'Pune Autorickshaw';
      case 'cab':
        return 'App Cab (Uber / Ola)';
      case 'walk':
        return 'Walking';
      default:
        return mode;
    }
  }

  return (
    <main className="min-h-screen text-[#44362e] bg-mesh pb-16">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[#FFBE91] bg-[#FFFCE1]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FFBE91] flex items-center justify-center">
              <Compass className="w-6 h-6 text-[#44362e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#44362e]">
                  OptiTrip
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFDDB0] text-[#44362e] border border-[#FFBE91]">
                  Pune Pilot
                </span>
              </div>
              <p className="text-xs text-[#44362e] hidden sm:block">
                Multi-Criteria Urban Route & Transit Optimizer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Supabase Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                isSupabaseConfigured
                  ? 'bg-[#CFEBFF] text-[#44362e] border-[#FFBE91]'
                  : 'bg-[#FFDDB0] text-[#44362e] border-[#FFBE91]'
              }`}
              title={
                isSupabaseConfigured
                  ? 'Supabase backend connected'
                  : 'Running in demo mode (Configure NEXT_PUBLIC_SUPABASE_URL in .env.local to persist)'
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isSupabaseConfigured ? 'Supabase Active' : 'Local Demo Mode'}
              </span>
            </div>

            {/* Time Band Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#CFEBFF] border border-[#FFBE91] text-[#44362e]">
              <Clock className="w-3.5 h-3.5 text-[#44362e]" />
              <span className="capitalize">{currentBand}</span>
              <span className="text-[#44362e]">({istTimeStr})</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#44362e] mb-3">
            Find the <span className="text-[#44362e]">smartest</span> way across Pune
          </h1>
          <p className="text-sm sm:text-base text-[#44362e]">
            Compare fare, travel duration, and realistic availability across transport options tailored to your priority.
          </p>
        </div>

        {/* Search & Inputs Panel */}
        <section className="glass-panel-elevated rounded-2xl p-5 sm:p-6 mb-8 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
            {/* Origin Input */}
            <div className="relative">
              <label htmlFor="origin-input" className="block text-xs font-medium text-[#44362e] mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#44362e]" /> Pickup Point
              </label>
              <input
                id="origin-input"
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder="e.g. Pune Railway Station"
                className="w-full bg-[#FFFCE1] border border-[#FFBE91] rounded-xl px-4 py-3 text-sm text-[#44362e] placeholder-[#44362e] focus:outline-none focus:ring-2 focus:ring-[#FFBE91] focus:border-[#FFBE91] transition-all"
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-2 md:my-0">
              <button
                type="button"
                id="swap-locations-btn"
                onClick={handleSwap}
                aria-label="Swap pickup and destination"
                className="p-2.5 rounded-full bg-[#CFEBFF] hover:bg-[#FFDDB0] border border-[#FFBE91] text-[#44362e] transition-all transform hover:rotate-180"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Input */}
            <div className="relative">
              <label htmlFor="dest-input" className="block text-xs font-medium text-[#44362e] mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#44362e]" /> Destination
              </label>
              <input
                id="dest-input"
                type="text"
                value={destInput}
                onChange={(e) => setDestInput(e.target.value)}
                placeholder="e.g. Swargate Bus Stand"
                className="w-full bg-[#FFFCE1] border border-[#FFBE91] rounded-xl px-4 py-3 text-sm text-[#44362e] placeholder-[#44362e] focus:outline-none focus:ring-2 focus:ring-[#FFBE91] focus:border-[#FFBE91] transition-all"
              />
            </div>
          </div>

          {/* Quick Preset Route Buttons */}
          <div className="mt-4 pt-4 border-t border-[#FFDDB0] flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6b584b] flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-[#44362e]" /> Demo Presets:
            </span>
            {PREPARED_ROUTES.map((route, idx) => (
              <button
                key={route.name}
                type="button"
                id={`preset-btn-${idx}`}
                onClick={() => handleSelectPreset(idx)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#CFEBFF] hover:bg-[#FFDDB0] border border-[#FFBE91] text-[#44362e] transition-colors"
              >
                {route.name}
              </button>
            ))}
          </div>

          {/* Submit Action Button */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#6b584b] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#44362e]" />
              <span>Uses public OpenStreetMap Nominatim & OSRM routing.</span>
            </div>

            <button
              type="button"
              id="calculate-route-btn"
              onClick={handleCalculateRoute}
              disabled={isCalculating}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FFBE91] hover:bg-[#FFDDB0] text-[#44362e] font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Looking up route...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Calculate & Optimize</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Error / Fallback Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#FFDDB0] border border-[#FFBE91] text-[#44362e] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">{errorMessage}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPreset(0)}
                  className="px-3 py-1 rounded-md bg-[#FFBE91] hover:bg-[#FFDDB0] text-[#44362e] text-xs font-medium border border-[#FFBE91] transition-colors"
                >
                  Load Pune Station ➔ Swargate Demo Route
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Priority Selector & Metric Info Bar */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#44362e] flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#44362e]" /> Optimization Priority
              </h2>
              <p className="text-xs text-[#6b584b]">
                Switch criteria to dynamically re-score and re-rank transport modes:
              </p>
            </div>

            {/* Current Route Stats Pill */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#CFEBFF] border border-[#FFBE91] text-xs text-[#44362e]">
              <div>
                <span className="text-[#6b584b]">Distance: </span>
                <span className="font-semibold text-[#44362e]">{distanceKm} km</span>
              </div>
              <div className="h-3 w-px bg-[#FFBE91]" />
              <div>
                <span className="text-[#6b584b]">Road Time: </span>
                <span className="font-semibold text-[#44362e]">{durationMin} min</span>
              </div>
              <div className="h-3 w-px bg-[#FFBE91]" />
              <div className="text-[#44362e] font-medium">{routeSource}</div>
            </div>
          </div>

          {/* Priority Pill Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <button
              type="button"
              id="prio-cheapest"
              onClick={() => handlePriorityChange('cheapest')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                priority === 'cheapest'
                  ? 'bg-[#FFDDB0] border-[#FFBE91] text-[#44362e]'
                  : 'bg-white border-[#FFDDB0] text-[#6b584b] hover:text-[#44362e] hover:bg-[#FFFCE1]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`w-4 h-4 ${priority === 'cheapest' ? 'text-[#44362e]' : 'text-[#6b584b]'}`} />
                <span className="font-semibold text-sm">Cheapest</span>
              </div>
              <p className="text-[11px] text-[#6b584b]">60% fare, 25% time, 15% reliability</p>
            </button>

            <button
              type="button"
              id="prio-fastest"
              onClick={() => handlePriorityChange('fastest')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                priority === 'fastest'
                  ? 'bg-[#FFBE91] border-[#FFBE91] text-[#44362e]'
                  : 'bg-white border-[#FFDDB0] text-[#6b584b] hover:text-[#44362e] hover:bg-[#FFFCE1]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className={`w-4 h-4 ${priority === 'fastest' ? 'text-[#44362e]' : 'text-[#6b584b]'}`} />
                <span className="font-semibold text-sm">Fastest</span>
              </div>
              <p className="text-[11px] text-[#6b584b]">60% travel time, 20% fare, 20% reliability</p>
            </button>

            <button
              type="button"
              id="prio-reliable"
              onClick={() => handlePriorityChange('reliable')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                priority === 'reliable'
                  ? 'bg-[#CFEBFF] border-[#FFBE91] text-[#44362e]'
                  : 'bg-white border-[#FFDDB0] text-[#6b584b] hover:text-[#44362e] hover:bg-[#FFFCE1]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className={`w-4 h-4 ${priority === 'reliable' ? 'text-[#44362e]' : 'text-[#6b584b]'}`} />
                <span className="font-semibold text-sm">Most Reliable</span>
              </div>
              <p className="text-[11px] text-[#6b584b]">60% availability & lowest wait time</p>
            </button>

            <button
              type="button"
              id="prio-balanced"
              onClick={() => handlePriorityChange('balanced')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                priority === 'balanced'
                  ? 'bg-[#CFEBFF] border-[#FFBE91] text-[#44362e]'
                  : 'bg-white border-[#FFDDB0] text-[#6b584b] hover:text-[#44362e] hover:bg-[#FFFCE1]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Compass className={`w-4 h-4 ${priority === 'balanced' ? 'text-[#44362e]' : 'text-[#6b584b]'}`} />
                <span className="font-semibold text-sm">Balanced</span>
              </div>
              <p className="text-[11px] text-[#6b584b]">40% cost, 30% speed, 30% reliability</p>
            </button>
          </div>
        </section>

        {/* Results Comparison Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#44362e] flex items-center gap-2">
              <span>Ranked Options</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#CFEBFF] text-[#44362e] font-normal">
                {recommendations.length} modes feasible
              </span>
            </h2>
            <span className="text-xs text-[#6b584b]">Sorted by dynamic score</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
              const isWinner = rec.rank === 1;
              return (
                <div
                  key={rec.mode}
                  className={`rounded-2xl p-5 transition-all relative overflow-hidden ${
                    isWinner
                      ? 'glass-card-winner border-[#FFBE91]'
                      : 'glass-panel border-[#FFDDB0] hover:border-[#FFBE91]'
                  }`}
                >
                  {/* Top Pick Ribbon for Rank 1 */}
                  {isWinner && (
                    <div className="absolute top-0 right-0 bg-[#FFBE91] text-[#44362e] font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Top Recommendation
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#CFEBFF] border border-[#FFBE91]">
                        {getModeIcon(rec.mode)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-[#44362e]">
                            {getModeName(rec.mode)}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isWinner
                                ? 'bg-[#FFBE91] text-[#44362e]'
                                : 'bg-[#CFEBFF] text-[#44362e]'
                            }`}
                          >
                            Rank #{rec.rank}
                          </span>
                        </div>
                        <p className="text-xs text-[#6b584b]">
                          Final Score: <span className="font-mono font-semibold text-[#44362e]">{rec.final_score}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tight text-[#44362e]">
                        {rec.price === 0 ? 'Free' : `₹${rec.price}`}
                      </div>
                      <div className="text-[10px] text-[#6b584b]">
                        Estimated fare (illustrative)
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 my-3 rounded-xl bg-[#FFFCE1] border border-[#FFDDB0] text-xs">
                    <div>
                      <div className="text-[#6b584b] text-[11px]">Travel Time</div>
                      <div className="font-bold text-[#44362e] text-sm">{rec.time} min</div>
                      <div className="text-[10px] text-[#6b584b]">route estimate</div>
                    </div>
                    <div>
                      <div className="text-[#6b584b] text-[11px]">Expected Wait</div>
                      <div className="font-bold text-[#44362e] text-sm">{rec.waitMin} min</div>
                      <div className="text-[10px] text-[#6b584b]">time-of-day model</div>
                    </div>
                    <div>
                      <div className="text-[#6b584b] text-[11px]">Availability</div>
                      <div className="font-bold text-[#44362e] text-sm">
                        {(rec.availability_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-[#6b584b]">demo heuristic</div>
                    </div>
                  </div>

                  {/* Reason Pill ("Why") */}
                  <div className="text-xs text-[#44362e] bg-[#FFFCE1] p-2.5 rounded-xl border border-[#FFDDB0] mb-3">
                    <span className="font-semibold text-[#6b584b]">Why this ranks: </span>
                    {rec.why}
                  </div>

                  {/* Criteria Breakdown Visual Bars */}
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="flex items-center justify-between text-[#6b584b]">
                      <span>Cost Factor</span>
                      <span className="font-mono">{(rec.breakdown.cost * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#CFEBFF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FFBE91] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, rec.breakdown.cost * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[#6b584b]">
                      <span>Speed Factor</span>
                      <span className="font-mono">{(rec.breakdown.speed * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#CFEBFF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FFDDB0] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, rec.breakdown.speed * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[#6b584b]">
                      <span>Reliability Factor</span>
                      <span className="font-mono">{(rec.breakdown.reliability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#CFEBFF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#CFEBFF] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, rec.breakdown.reliability * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Supabase Persistence Activity Banner */}
        {supabaseStatus.saved && (
          <div className="mb-8 p-3 rounded-xl bg-[#CFEBFF] border border-[#FFBE91] text-[#44362e] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#44362e]" />
            <span>Successfully logged search & recommendation results to Supabase (Query ID: <code className="font-mono">{supabaseStatus.queryId}</code>)</span>
          </div>
        )}

        {/* Data Honesty Table Callout (README Section 4 Compliance) */}
        <section className="glass-panel rounded-2xl p-6 border-[#FFDDB0]">
          <h3 className="text-base font-bold text-[#44362e] mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#44362e]" /> Data Transparency & Calculation Basis
          </h3>
          <p className="text-xs text-[#6b584b] mb-4">
            OptiTrip clearly distinguishes between measured external service data and transparent demonstration estimates:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FFFCE1] border border-[#FFDDB0]">
              <div className="font-semibold text-[#44362e]">Road Distance & Duration</div>
              <div className="text-[#6b584b] mt-1">OpenStreetMap OSRM public demo routing service (when reachable).</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFFCE1] border border-[#FFDDB0]">
              <div className="font-semibold text-[#44362e]">Auto & Cab Fares</div>
              <div className="text-[#6b584b] mt-1">Pune RTA meter formula (₹30/1.5km + ₹20/km) & calibrated cab base rates. Illustrative, not live quotes.</div>
            </div>
            <div className="p-3 rounded-xl bg-[#FFFCE1] border border-[#FFDDB0]">
              <div className="font-semibold text-[#44362e]">PMPML Bus Fares & Time</div>
              <div className="text-[#6b584b] mt-1">Official 11-stage fare chart with 1.7x traffic multiplier and 6-minute walking access buffer.</div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#FFDDB0] text-center text-xs text-[#6b584b] py-6">
        <p>OptiTrip — One-Day Demonstration Project · Team A, B, C</p>
        <p className="mt-1 text-[#6b584b]">Built with Next.js, TypeScript, OpenStreetMap, and Supabase · Deployed on Vercel</p>
      </footer>
    </main>
  );
}
