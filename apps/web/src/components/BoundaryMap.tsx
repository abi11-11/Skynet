import type { GeoJSONPolygon } from "@skynet/types";

type BoundaryMapProps = {
  polygon: GeoJSONPolygon;
  width?: number;
  height?: number;
};

export default function BoundaryMap({ polygon, width = 320, height = 220 }: BoundaryMapProps) {
  const ring = polygon.coordinates[0] ?? [];
  if (!ring.length) {
    return <div style={{ color: "#64748b", marginTop: 8 }}>No polygon boundary available.</div>;
  }

  const xs = ring.map((coord) => coord[0]);
  const ys = ring.map((coord) => coord[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 8;
  const xScale = maxX - minX !== 0 ? (width - padding * 2) / (maxX - minX) : 1;
  const yScale = maxY - minY !== 0 ? (height - padding * 2) / (maxY - minY) : 1;
  const scale = Math.min(xScale, yScale);

  const points = ring
    .map(([x, y]) => {
      const px = (x - minX) * scale + padding;
      const py = height - ((y - minY) * scale + padding);
      return `${px},${py}`;
    })
    .join(" ");

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        width,
        height,
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <rect x={0} y={0} width={width} height={height} fill="#f8fafc" />
        <polygon points={points} fill="rgba(34, 197, 94, 0.18)" stroke="#16a34a" strokeWidth={2} />
      </svg>
    </div>
  );
}
