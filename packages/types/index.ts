export type GeoJSONPosition = [number, number];

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
};

export type GeoJSONPoint = {
  type: "Point";
  coordinates: GeoJSONPosition;
};

export type FarmPlot = {
  id: string;
  owner_id: string;
  manager_id: string | null;
  parent_plot_id: string | null;
  name: string;
  description: string | null;
  area: GeoJSONPolygon | string | null;
  created_at: string;
  updated_at: string;
};

export type FarmPlotAssignment = {
  id: string;
  plot_id: string;
  user_id: string;
  assigned_at: string;
};

export type HazardPin = {
  id: string;
  plot_id: string;
  reported_by: string | null;
  location: GeoJSONPoint | string | null;
  image_path: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  plot_id: string;
  pilot_id: string | null;
  status: 'pending' | 'ready_to_fly' | 'completed';
  checkout_signature: string | null;
  acknowledged_hazards: string[];
  created_at: string;
  updated_at: string;
};
