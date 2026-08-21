export type GeoJSONPosition = [number, number];

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: GeoJSONPosition[][];
};

export type GeoJSONPoint = {
  type: "Point";
  coordinates: GeoJSONPosition;
};

export type Tenant = {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  created_at: string;
};

export type TenantUser = {
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'sub-manager';
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  user_type: 'owner' | 'manager' | 'farmer' | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type Role = {
  id: string;
  tenant_id: string | null;
  parent_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type GroupRole = {
  id: string;
  group_id: string;
  role_id: string;
  created_at: string;
};

export type UserGroup = {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
};

export type FarmPlot = {
  id: string;
  tenant_id: string;
  owner_id: string;
  manager_id: string | null;
  parent_plot_id: string | null;
  name: string;
  description: string | null;
  area: GeoJSONPolygon | string | null;
  metadata?: any;
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
