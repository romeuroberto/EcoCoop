import { Injectable } from '@nestjs/common';
import type { GeocodingProvider, GeocodingResult } from './geocoding.provider';

interface NominatimResult {
  lat: string;
  lon: string;
}

@Injectable()
export class NominatimGeocodingProvider implements GeocodingProvider {
  async geocode(address: string): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });
      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'EcoCoop/1.0 (ecocoop@ecocoop.local)' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const results = (await response.json()) as NominatimResult[];
      if (!results.length) return null;
      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { lat, lng };
    } catch {
      return null;
    }
  }
}
