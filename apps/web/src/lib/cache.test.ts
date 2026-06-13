import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { saveFarmPlots, getCachedFarmPlots } from './cache';
import type { FarmPlot } from '@skynet/types';

describe('web cache contract', () => {
  const mockPlots: FarmPlot[] = [
    {
      id: '1',
      tenant_id: 't1',
      name: 'Plot 1',
      area: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      metadata: {}
    }
  ];

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        for (const key in store) delete store[key];
      }),
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves farm plots to local storage', () => {
    saveFarmPlots(mockPlots);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'skynet_farm_plots',
      JSON.stringify(mockPlots)
    );
  });

  it('retrieves cached farm plots', () => {
    localStorage.setItem('skynet_farm_plots', JSON.stringify(mockPlots));
    const cached = getCachedFarmPlots();
    expect(localStorage.getItem).toHaveBeenCalledWith('skynet_farm_plots');
    expect(cached).toEqual(mockPlots);
  });

  it('returns null if nothing is cached', () => {
    const cached = getCachedFarmPlots();
    expect(cached).toBeNull();
  });

  it('handles read errors gracefully', () => {
    vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
      throw new Error('Storage error');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const cached = getCachedFarmPlots();
    
    expect(cached).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to read cached plots', expect.any(Error));
  });

  it('handles write errors gracefully', () => {
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error('Storage error');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    saveFarmPlots(mockPlots);
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to cache plots', expect.any(Error));
  });
});