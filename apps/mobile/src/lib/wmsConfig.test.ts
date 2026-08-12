import { getSentinelHubWmsUrl } from './wmsConfig';

describe('wmsConfig', () => {
  it('should generate a valid WMS URL with static time parameter for caching', () => {
    const url = getSentinelHubWmsUrl('NDVI');
    
    expect(url).toContain('services.sentinel-hub.com/ogc/wms');
    expect(url).toContain('LAYERS=NDVI');
    
    // It should have a standardized TIME parameter to ensure MapLibre caches it
    // using local date to avoid midnight cache misses
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(url).toContain(`TIME=${localToday}/${localToday}`);
  });

  it('should generate a valid Weather WMS URL', () => {
    const url = getSentinelHubWmsUrl('WEATHER');
    expect(url).toContain('LAYERS=WEATHER');
  });
});
