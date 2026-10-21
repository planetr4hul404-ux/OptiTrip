'use client';

import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { MapViewProps } from './MapView';

const PUNE_CENTER: [number, number] = [18.5204, 73.8567];

function FitRoute({
  origin,
  destination,
  routeGeometry,
}: MapViewProps) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...(origin ? [[origin.lat, origin.lon] as [number, number]] : []),
      ...(destination ? [[destination.lat, destination.lon] as [number, number]] : []),
      ...(routeGeometry ?? []),
    ];

    if (points.length > 1) {
      map.fitBounds(points as LatLngBoundsExpression, { padding: [32, 32] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.setView(PUNE_CENTER, 12);
    }
  }, [destination, map, origin, routeGeometry]);

  return null;
}

function MapClickHandler({
  onMapClick,
}: Pick<MapViewProps, 'onMapClick'>) {
  useMapEvents({
    click(event) {
      onMapClick?.({
        lat: event.latlng.lat,
        lon: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function LeafletMap({
  origin,
  destination,
  routeGeometry,
  onMapClick,
}: MapViewProps) {
  return (
    <div className="map-shell h-80 overflow-hidden rounded-2xl">
      <MapContainer
        center={PUNE_CENTER}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={onMapClick} />

        {routeGeometry && routeGeometry.length > 1 && (
          <Polyline
            positions={routeGeometry}
            pathOptions={{ color: '#FFBE91', weight: 5, opacity: 0.9 }}
          />
        )}

        {origin && (
          <CircleMarker
            center={[origin.lat, origin.lon]}
            radius={9}
            pathOptions={{
              color: '#44362e',
              fillColor: '#FFBE91',
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}

        {destination && (
          <CircleMarker
            center={[destination.lat, destination.lon]}
            radius={9}
            pathOptions={{
              color: '#44362e',
              fillColor: '#CFEBFF',
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}

        <FitRoute
          origin={origin}
          destination={destination}
          routeGeometry={routeGeometry}
        />
      </MapContainer>
    </div>
  );
}
