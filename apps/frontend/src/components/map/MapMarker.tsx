import L from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import type { MapPoint } from './MapView';

function createNumberedIcon(seq?: number): L.DivIcon {
  const label = seq != null ? String(seq) : '•';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#16a34a;color:#fff;border-radius:50%;
      width:28px;height:28px;display:flex;align-items:center;
      justify-content:center;font-size:12px;font-weight:700;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface MapMarkerProps {
  point: MapPoint;
}

export function MapMarker({ point }: MapMarkerProps) {
  return (
    <Marker position={[point.lat, point.lng]} icon={createNumberedIcon(point.sequenceNumber)}>
      {point.label && <Tooltip permanent={false}>{point.label}</Tooltip>}
    </Marker>
  );
}
