import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEmergencyCall } from './useEmergencyCall';
import { supabase } from '../../../lib/supabase';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('useEmergencyCall', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('invokes the emergency-call edge function successfully', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const { result } = renderHook(() => useEmergencyCall(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', hazardId: 'hazard-456' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.functions.invoke).toHaveBeenCalledWith('emergency-call', {
      body: { bookingId: 'booking-123', hazardId: 'hazard-456' },
    });
  });

  it('handles edge function errors gracefully', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() => useEmergencyCall(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', hazardId: 'hazard-456' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('falls back to String(error) if error.message is missing', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN_ERROR' }, // No message property
    });

    const { result } = renderHook(() => useEmergencyCall(), { wrapper });

    result.current.mutate({ bookingId: 'booking-123', hazardId: 'hazard-456' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('[object Object]');
  });
});
