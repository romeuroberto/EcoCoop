import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

interface PointCoord {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighbor(points: PointCoord[]): string[] {
  if (points.length === 0) return [];
  const visited = new Set<string>();
  const order: string[] = [];
  let current = points[0];
  visited.add(current.id);
  order.push(current.id);

  while (order.length < points.length) {
    let nearest: PointCoord | null = null;
    let minDist = Infinity;
    for (const p of points) {
      if (visited.has(p.id)) continue;
      const d = haversineKm(current.lat, current.lng, p.lat, p.lng);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    if (!nearest) break;
    visited.add(nearest.id);
    order.push(nearest.id);
    current = nearest;
  }

  return order;
}

@Injectable()
export class RouteSequenceSuggesterService {
  constructor(private prisma: PrismaService) {}

  async suggest(routeId: string) {
    const routePoints = await this.prisma.routePoint.findMany({
      where: { routeId },
      include: {
        collectionPoint: {
          select: { id: true, name: true, latitude: true, longitude: true, locationPending: true },
        },
      },
    });

    const withCoords: PointCoord[] = [];
    const excluded: Array<{ id: string; name: string; reason: string }> = [];

    for (const rp of routePoints) {
      const cp = rp.collectionPoint;
      if (cp.locationPending || cp.latitude == null || cp.longitude == null) {
        excluded.push({ id: cp.id, name: cp.name, reason: 'locationPending' });
      } else {
        withCoords.push({
          id: cp.id,
          name: cp.name,
          lat: Number(cp.latitude),
          lng: Number(cp.longitude),
        });
      }
    }

    const suggestedOrder = nearestNeighbor(withCoords);

    const warning =
      excluded.length > 0
        ? `${excluded.length} ponto(s) sem coordenadas foram excluídos da sugestão.`
        : undefined;

    return { suggestedOrder, excludedPoints: excluded, warning };
  }
}
