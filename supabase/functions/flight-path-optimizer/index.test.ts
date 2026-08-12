import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
import * as turf from 'npm:@turf/turf@6.5.0'
import { generateFlightPath } from './flightPathGenerator.ts'

Deno.test('Flight Path Optimizer - Generates lawnmower grid for simple polygon without hazards', () => {
  // 100m x 100m plot
  const polygon = turf.polygon([[
    [0, 0],
    [0.001, 0],
    [0.001, 0.001],
    [0, 0.001],
    [0, 0]
  ]])

  const result = generateFlightPath(polygon.geometry, [])

  // Should successfully return a LineString
  assertExists(result)
  assertEquals('error' in result, false)
  
  const flightPath = result as turf.Feature<turf.LineString>
  assertEquals(flightPath.geometry.type, 'LineString')

  // A ~111m x 111m plot (0.001° at equator) with 5m spacing should yield many waypoints.
  // Assert we have at least 10 — a true sanity check on grid generation.
  assertEquals(flightPath.geometry.coordinates.length > 10, true, 'Expected at least 10 waypoints for a standard plot')
})

Deno.test('Flight Path Optimizer - Unflyable when hazard buffer covers entire plot', () => {
  // Small 10m x 10m plot
  const polygon = turf.polygon([[
    [0, 0],
    [0.0001, 0],
    [0.0001, 0.0001],
    [0, 0.0001],
    [0, 0]
  ]])

  // Hazard exactly in the middle
  const hazard = turf.point([0.00005, 0.00005])

  const result = generateFlightPath(polygon.geometry, [hazard.geometry])

  // A 10m buffer around a central hazard in a tiny 10m x 10m plot fully covers it.
  // leaving the remaining area too small to fly (< 2 points on a 5m grid)
  assertEquals('error' in result, true)
  assertEquals((result as {error: string}).error, 'Plot is unflyable')
})

Deno.test('Flight Path Optimizer - Routes around hazards', () => {
  // ~110m x 110m plot (0.001° at equator) — large enough to route around a hazard
  // but small enough to stay under the 5,000-vertex limit with 5m spacing.
  const polygon = turf.polygon([[
    [0, 0],
    [0.001, 0],
    [0.001, 0.001],
    [0, 0.001],
    [0, 0]
  ]])

  // Hazard in the interior of the plot (not the corner, to guarantee sweep lines cross it)
  const hazard = turf.point([0.0005, 0.0005])

  const result = generateFlightPath(polygon.geometry, [hazard.geometry])

  // Should successfully return a LineString that avoids the hazard
  assertExists(result)
  assertEquals('error' in result, false)
  const flightPath = result as turf.Feature<turf.LineString>
  
  // Verify no point in the flight path intersects with the hazard's 10m buffer
  const buffer = turf.buffer(hazard, 10, { units: 'meters' })
  
  let intersects = false
  for (const pt of flightPath.geometry.coordinates) {
    // ignoreBoundary: a point exactly at the 10m radius edge is not "inside" the exclusion zone.
    if (turf.booleanPointInPolygon(turf.point(pt), buffer!, { ignoreBoundary: true })) {
      intersects = true
      break
    }
  }
  
  assertEquals(intersects, false, 'Flight path must not enter hazard buffer')
})
