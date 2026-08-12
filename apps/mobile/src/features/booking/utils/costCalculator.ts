import area from '@turf/area';
import { polygon } from '@turf/helpers';
import type { GeoJSONPolygon } from '@skynet/types';

const SQ_METERS_PER_ACRE = 4046.8564224;

export function calculateAreaInAcres(geoJsonPoly: GeoJSONPolygon): number {
  if (!geoJsonPoly || !geoJsonPoly.coordinates) return 0;
  try {
    const poly = polygon(geoJsonPoly.coordinates);
    const areaSqMeters = area(poly);
    return areaSqMeters / SQ_METERS_PER_ACRE;
  } catch (error) {
    console.error("Failed to calculate area", error);
    return 0;
  }
}

export function calculateCost(acres: number, ratePerAcre: number): number {
  return Math.round(acres * ratePerAcre * 100) / 100;
}

export function calculateChemicalVolume(acres: number, volumePerAcre: number): number {
  return Math.round(acres * volumePerAcre * 100) / 100;
}
