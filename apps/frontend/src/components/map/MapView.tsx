import { useEffect } from 'react';
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapMarker } from './MapMarker';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  sequenceNumber?: number;
}

interface MapViewProps {
  points?: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showRouteLine?: boolean;
}

const DEFAULT_CENTER: [number, number] = [-15.7942, -47.8822]; // Brasília

function FitMapToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 13));
      return;
    }

    map.fitBounds(
      points.map((point) => [point.lat, point.lng] as [number, number]),
      { padding: [32, 32], maxZoom: 15 },
    );
  }, [map, points]);

  return null;
}

export function MapView({ points = [], center, zoom = 13, height = '320px', showRouteLine = false }: MapViewProps) {
  const mapCenter: [number, number] =
    center ??
    (points.length > 0 ? [points[0].lat, points[0].lng] : DEFAULT_CENTER);
  const routePositions = points.map((point) => [point.lat, point.lng] as [number, number]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMapToPoints points={points} />
      {showRouteLine && routePositions.length > 1 && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#15803d',
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}
      {points.map((p) => (
        <MapMarker key={p.id} point={p} />
      ))}
    </MapContainer>
  );
}
