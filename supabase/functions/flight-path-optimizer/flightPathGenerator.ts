import * as turf from 'npm:@turf/turf@6.5.0'

export function generateFlightPath(plotPolygon: turf.Polygon | turf.MultiPolygon, hazardPoints: turf.Point[]): turf.Feature<turf.LineString> | { error: string } {
  let safePolygon: turf.Feature<turf.Polygon | turf.MultiPolygon> | null = turf.feature(plotPolygon)

  if (hazardPoints && hazardPoints.length > 0) {
    for (const ptGeo of hazardPoints) {
      if (!safePolygon) break;
      const pt = turf.feature(ptGeo)
      const buffer = turf.buffer(pt, 10, { units: 'meters' })
      if (buffer) {
         safePolygon = turf.difference(safePolygon, buffer) as turf.Feature<turf.Polygon | turf.MultiPolygon> | null
      }
    }
  }

  if (!safePolygon) return { error: 'Plot is unflyable' }

  // Apply a 0.5m inward erosion so no waypoint lands exactly on the hazard buffer
  // boundary (which booleanPointInPolygon treats as "inside"). This also provides
  // a small real-world safety margin at the edge of the exclusion zone.
  const safePolygonEroded = turf.buffer(safePolygon, -0.5, { units: 'meters' })
  if (!safePolygonEroded) return { error: 'Safe area too small to fly after boundary erosion' }

  const bbox = turf.bbox(safePolygonEroded)
  const pointGrid = turf.pointGrid(bbox, 5, { units: 'meters', mask: safePolygonEroded })

  if (pointGrid.features.length < 2) return { error: 'Safe area too small to fly' }

  const rowMap = new Map<number, turf.Position[]>()
  // 1e6 precision ≈ 0.11m at equator — sufficient for Tamil Nadu farming context.
  // Near-pole usage would require higher precision but is not in scope.
  const quantize = (val: number) => Math.round(val * 1e6) / 1e6

  turf.coordEach(pointGrid, (coord) => {
    const y = quantize(coord[1])
    if (!rowMap.has(y)) rowMap.set(y, [])
    rowMap.get(y)!.push(coord)
  })

  const sortedY = Array.from(rowMap.keys()).sort((a, b) => b - a)
  const waypoints: turf.Position[] = []
  let leftToRight = true

  for (const y of sortedY) {
    const row = rowMap.get(y)!
    if (row.length === 0) continue
    row.sort((a, b) => a[0] - b[0])
    if (!leftToRight) row.reverse()
    waypoints.push(...row)
    leftToRight = !leftToRight
  }

  if (waypoints.length < 2) return { error: 'Failed to generate sufficient waypoints' }

  // Architecture hard limit: max 5,000 vertices to prevent renderer crashes.
  // See: architecture.md § Hardened Implementation Requirements
  if (waypoints.length > 5000) {
    return { error: 'Plot too large: generated path exceeds 5,000-vertex limit. Reduce plot size or increase sweep spacing.' }
  }

  return turf.lineString(waypoints)
}
