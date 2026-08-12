import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFetchActiveBooking } from './useFetchActiveBooking';
import { supabase } from '../../../lib/supabase';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useFetchActiveBooking', () => {
  let queryClient: QueryClient;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;
  let mockLimit: jest.Mock;
  let mockMaybeSingle: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    
    mockMaybeSingle = jest.fn();
    mockLimit = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    
    // Setup chaining: eq('plot_id', plotId).in('status', ['pending', 'ready_to_fly'])
    mockEq = jest.fn().mockImplementation(() => ({
      in: jest.fn().mockReturnValue({ order: mockOrder }),
      order: mockOrder,
    }));
    
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches the most recent booking for a plot', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'b1', plot_id: 'p1', checkout_signature: '2026-01-01T00:00:00Z' },
      error: null,
    });

    const { result } = renderHook(() => useFetchActiveBooking('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.from).toHaveBeenCalledWith('bookings');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('plot_id', 'p1');
    // We need to check the chained in call, which is the result of the first eq
    const chainedIn = mockEq.mock.results[0].value.in;
    expect(chainedIn).toHaveBeenCalledWith('status', ['pending', 'ready_to_fly']);
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result.current.data?.id).toBe('b1');
  });

  it('returns null when no booking exists', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useFetchActiveBooking('p1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
