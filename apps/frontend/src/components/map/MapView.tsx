import { MapContainer, TileLayer } from 'react-leaflet';
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
}

const DEFAULT_CENTER: [number, number] = [-15.7942, -47.8822]; // Brasília

export function MapView({ points = [], center, zoom = 13, height = '320px' }: MapViewProps) {
  const mapCenter: [number, number] =
    center ??
    (points.length > 0 ? [points[0].lat, points[0].lng] : DEFAULT_CENTER);

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
      {points.map((p) => (
        <MapMarker key={p.id} point={p} />
      ))}
    </MapContainer>
  );
}
