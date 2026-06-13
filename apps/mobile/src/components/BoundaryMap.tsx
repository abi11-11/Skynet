import { View, Text } from "react-native";
import type { GeoJSONPolygon } from "@skynet/types";

type BoundaryMapProps = {
  polygon: GeoJSONPolygon;
};

export default function BoundaryMapStub({ polygon }: BoundaryMapProps) {
  const ring = polygon.coordinates[0] ?? [];
  const formatted = ring.slice(0, 4).map((point, index) => `#${index + 1}: ${point[0].toFixed(4)}, ${point[1].toFixed(4)}`);

  return (
    <View style={{ marginTop: 12, borderRadius: 16, padding: 12, backgroundColor: "#111827", borderColor: "#334155", borderWidth: 1 }}>
      <Text style={{ color: "#a7f3d0", fontWeight: "700", marginBottom: 6 }}>Boundary map stub</Text>
      <Text style={{ color: "#cbd5e1", marginBottom: 6 }}>Polygon vertices: {ring.length}</Text>
      {formatted.map((row) => (
        <Text key={row} style={{ color: "#cbd5e1", fontSize: 12 }}>
          {row}
        </Text>
      ))}
      {ring.length > 4 ? <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>...more points available</Text> : null}
    </View>
  );
}
