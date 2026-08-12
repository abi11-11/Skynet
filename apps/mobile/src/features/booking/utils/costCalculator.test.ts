import { calculateAreaInAcres, calculateCost, calculateChemicalVolume } from './costCalculator';
import type { GeoJSONPolygon } from '@skynet/types';

describe('costCalculator', () => {
  it('calculates area in acres correctly', () => {
    // Create a 100m x 100m square (10,000 sq meters = ~2.47 acres)
    const mockPoly: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [0, 0.0009],
        [0.0009, 0.0009],
        [0.0009, 0],
        [0, 0]
      ]]
    };
    
    const acres = calculateAreaInAcres(mockPoly);
    expect(acres).toBeGreaterThan(2);
    expect(acres).toBeLessThan(3);
  });

  it('calculates cost correctly', () => {
    expect(calculateCost(2.5, 800)).toBe(2000);
    expect(calculateCost(0, 800)).toBe(0);
  });

  it('calculates chemical volume correctly', () => {
    expect(calculateChemicalVolume(2.5, 10)).toBe(25);
    expect(calculateChemicalVolume(0, 10)).toBe(0);
  });
});
