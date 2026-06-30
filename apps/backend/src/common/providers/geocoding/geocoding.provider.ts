export interface GeocodingResult {
  lat: number;
  lng: number;
}

export const GEOCODING_PROVIDER = 'GEOCODING_PROVIDER';

export interface GeocodingProvider {
  geocode(address: string): Promise<GeocodingResult | null>;
}
