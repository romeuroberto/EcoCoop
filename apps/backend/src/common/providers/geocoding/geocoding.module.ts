import { Module } from '@nestjs/common';
import { GEOCODING_PROVIDER } from './geocoding.provider';
import { NominatimGeocodingProvider } from './nominatim.geocoding.provider';

@Module({
  providers: [
    {
      provide: GEOCODING_PROVIDER,
      useClass: NominatimGeocodingProvider,
    },
  ],
  exports: [GEOCODING_PROVIDER],
})
export class GeocodingModule {}
