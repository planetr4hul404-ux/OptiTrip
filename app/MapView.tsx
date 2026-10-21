'use client';

import dynamic from 'next/dynamic';
import type { Coordinates } from '@/lib/maps';

export type MapViewProps = {
  origin?: Coordinates;
  destination?: Coordinates;
  routeGeometry?: [number, number][];
  pinTarget?: 'origin' | 'destination';
  onMapClick?: (coordinates: Coordinates) => void;
};

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="map-shell flex h-80 items-center justify-center text-sm text-[#44362e]">
      Loading map...
    </div>
  ),
});

export default function MapView(props: MapViewProps) {
  return <LeafletMap {...props} />;
}