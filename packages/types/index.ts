export type GeoJSONPosition = [number, number];

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
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
