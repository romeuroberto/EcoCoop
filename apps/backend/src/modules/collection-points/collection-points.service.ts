import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GEOCODING_PROVIDER, GeocodingProvider } from '../../common/providers/geocoding/geocoding.provider';
import type { CreateCollectionPointDto } from './dto/create-collection-point.dto';
import type { UpdateCollectionPointDto } from './dto/update-collection-point.dto';

export interface ListCollectionPointsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  locationPending?: boolean;
}

@Injectable()
export class CollectionPointsService {
  constructor(
    private prisma: PrismaService,
    @Inject(GEOCODING_PROVIDER) private geocoding: GeocodingProvider,
  ) {}

  async list(query: ListCollectionPointsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status !== 'all') {
      where['isActive'] = query.status !== 'inactive';
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where['OR'] = [
        { name: { contains: s, mode: 'insensitive' } },
        { address: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.locationPending !== undefined) {
      where['locationPending'] = query.locationPending;
    }

    const [data, total] = await Promise.all([
      this.prisma.collectionPoint.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.collectionPoint.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const point = await this.prisma.collectionPoint.findUnique({ where: { id } });
    if (!point) {
      throw new NotFoundException({ statusCode: 404, message: 'Ponto de coleta não encontrado', code: 'COLLECTION_POINT_NOT_FOUND' });
    }
    return point;
  }

  async create(dto: CreateCollectionPointDto) {
    const hasManualCoords = dto.latitude != null && dto.longitude != null;

    const point = await this.prisma.collectionPoint.create({
      data: {
        name: dto.name,
        address: dto.address,
        reference: dto.reference,
        latitude: hasManualCoords ? dto.latitude : null,
        longitude: hasManualCoords ? dto.longitude : null,
        locationPending: !hasManualCoords,
      },
    });

    if (!hasManualCoords) {
      this.tryGeocodeAsync(point.id, dto.address);
    }

    return point;
  }

  async update(id: string, dto: UpdateCollectionPointDto) {
    await this.findOne(id);

    const hasManualCoords = dto.latitude != null && dto.longitude != null;
    const clearingAddress = dto.address != null && !hasManualCoords;

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.address !== undefined) data['address'] = dto.address;
    if (dto.reference !== undefined) data['reference'] = dto.reference;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;

    if (hasManualCoords) {
      data['latitude'] = dto.latitude;
      data['longitude'] = dto.longitude;
      data['locationPending'] = false;
    }

    const updated = await this.prisma.collectionPoint.update({ where: { id }, data });

    if (clearingAddress) {
      this.tryGeocodeAsync(id, dto.address as string);
    }

    return updated;
  }

  private tryGeocodeAsync(id: string, address: string): void {
    this.geocoding
      .geocode(address)
      .then(async (result) => {
        if (!result) return;
        await this.prisma.collectionPoint.update({
          where: { id },
          data: { latitude: result.lat, longitude: result.lng, locationPending: false },
        });
      })
      .catch(() => {
        // Geocoding failures must never crash the main request
      });
  }
}
