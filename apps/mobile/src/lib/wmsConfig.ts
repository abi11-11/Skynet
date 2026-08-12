/**
 * Generates a MapLibre-compatible WMS URL for Sentinel Hub.
 * 
 * To mitigate MapLibre's OfflineManager issues with dynamic parameters,
 * we standardize the TIME parameter to the current local day (YYYY-MM-DD),
 * which ensures the URL remains static for the entire day locally,
 * allowing the ambient cache to hit successfully when offline.
 */
export const getSentinelHubWmsUrl = (layer: 'NDVI' | 'WEATHER'): string => {
  const instanceId = process.env.EXPO_PUBLIC_SENTINEL_HUB_INSTANCE_ID || 'demo-instance-id';
  
  const baseUrl = `https://services.sentinel-hub.com/ogc/wms/${instanceId}`;
  
  // Standardize the TIME parameter to today's local date so the URL is highly cacheable
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeParam = `${localToday}/${localToday}`;
  
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    LAYERS: layer,
    TIME: timeParam,
    WIDTH: '256',
    HEIGHT: '256',
    CRS: 'EPSG:3857',
    STYLES: '',
    // MapLibre native will append BBOX automatically for raster sources
  });

  // MapLibre requires the {bbox-epsg-3857} placeholder in the URL string 
  // so it can dynamically replace it for each tile.
  return `${baseUrl}?${params.toString()}&BBOX={bbox-epsg-3857}`;
};
