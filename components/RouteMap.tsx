'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates } from '@/lib/maps';

// Custom MapPin markers using Leaflet DivIcon (avoids missing asset png issues)
function createCustomPin(color: string, label: string) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: ${color};
        color: #ffffff;
        font-weight: bold;
        font-size: 13px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <span style="transform: rotate(45deg);">${label}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

const originPin = createCustomPin('#10b981', 'A'); // Green for Pickup
const destPin = createCustomPin('#f97316', 'B');   // Coral/Orange for Destination

// Auto-adjust map view bounds when points or polyline change
function MapBoundsAdjuster({
  originCoords,
  destCoords,
  polyline,
}: {
  originCoords: Coordinates | null;
  destCoords: Coordinates | null;
  polyline?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    if (originCoords) {
      points.push([originCoords.lat, originCoords.lon]);
    }
    if (destCoords) {
      points.push([destCoords.lat, destCoords.lon]);
    }
    if (polyline && polyline.length > 0) {
      points.push(...polyline);
    }

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
    }
  }, [originCoords, destCoords, polyline, map]);

  return null;
}

export interface RouteMapProps {
  originCoords: Coordinates | null;
  destCoords: Coordinates | null;
  originName?: string;
  destName?: string;
  routeCoordinates?: [number, number][];
  isFallback?: boolean;
  distanceKm?: number;
  durationMin?: number;
  sourceNote?: string;
}

export default function RouteMap({
  originCoords,
  destCoords,
  originName = 'Pickup',
  destName = 'Destination',
  routeCoordinates = [],
  isFallback = false,
  distanceKm,
  durationMin,
  sourceNote,
}: RouteMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-72 sm:h-80 w-full rounded-2xl bg-[#FFFCE1] border border-[#FFDDB0] flex items-center justify-center text-xs text-[#6b584b]">
        <span>Initializing map...</span>
      </div>
    );
  }

  // Default Pune center if coordinates not yet resolved
  const defaultCenter: [number, number] = originCoords
    ? [originCoords.lat, originCoords.lon]
    : [18.5204, 73.8567]; // Pune center

  // Derive polyline points: either full OSRM path or direct connecting line
  const polylinePoints: [number, number][] =
    routeCoordinates.length > 0
      ? routeCoordinates
      : originCoords && destCoords
      ? [
          [originCoords.lat, originCoords.lon],
          [destCoords.lat, destCoords.lon],
        ]
      : [];

  const lineColor = isFallback ? '#8b5cf6' : '#e07a3c'; // Purple for fallback, orange for live OSRM

  return (
    <div className="relative w-full h-72 sm:h-84 md:h-96 rounded-2xl overflow-hidden border border-[#FFDDB0] shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Origin Marker */}
        {originCoords && (
          <Marker position={[originCoords.lat, originCoords.lon]} icon={originPin}>
            <Popup>
              <div className="text-xs">
                <span className="font-bold text-[#10b981] block uppercase tracking-wider text-[10px]">
                  Pickup Point
                </span>
                <p className="font-semibold text-gray-800">{originName}</p>
                <p className="text-[10px] text-gray-500">
                  {originCoords.lat.toFixed(4)}, {originCoords.lon.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destCoords && (
          <Marker position={[destCoords.lat, destCoords.lon]} icon={destPin}>
            <Popup>
              <div className="text-xs">
                <span className="font-bold text-[#f97316] block uppercase tracking-wider text-[10px]">
                  Destination
                </span>
                <p className="font-semibold text-gray-800">{destName}</p>
                <p className="text-[10px] text-gray-500">
                  {destCoords.lat.toFixed(4)}, {destCoords.lon.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {polylinePoints.length > 1 && (
          <Polyline
            positions={polylinePoints}
            pathOptions={{
              color: lineColor,
              weight: 5,
              opacity: 0.85,
              dashArray: isFallback ? '6, 8' : undefined,
            }}
          />
        )}

        {/* View bounds adjuster */}
        <MapBoundsAdjuster
          originCoords={originCoords}
          destCoords={destCoords}
          polyline={polylinePoints}
        />
      </MapContainer>

      {/* Floating Status & Source Overlay Badge */}
      <div className="absolute top-3 right-3 z-[1000] max-w-[85%] pointer-events-none">
        <div className="bg-[#FFFCE1]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#FFBE91] shadow-md text-xs text-[#44362e] flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                isFallback ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{isFallback ? 'Prepared Fallback Route' : 'Live OSRM Route'}</span>
          </div>
          {distanceKm !== undefined && durationMin !== undefined && (
            <div className="text-[11px] text-[#6b584b]">
              <span>{distanceKm} km</span> · <span>~{durationMin} min road time</span>
            </div>
          )}
          {sourceNote && (
            <div className="text-[9px] text-[#6b584b] italic border-t border-[#FFDDB0] pt-0.5 mt-0.5">
              {sourceNote}
            </div>
          )}
        </div>
      </div>

      {/* Map Legend (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-[#FFFCE1]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#FFDDB0] text-[10px] text-[#44362e] flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
            <span>Drop</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3.5 h-1 rounded"
              style={{ backgroundColor: lineColor }}
            />
            <span>{isFallback ? 'Sample Path' : 'Road Path'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

