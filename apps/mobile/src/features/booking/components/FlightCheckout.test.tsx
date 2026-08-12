import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import FlightCheckout from './FlightCheckout';
import { useFetchHazardPins } from '../../map/api/useFetchHazardPins';
import { useCheckoutFlight } from '../api/useCheckoutFlight';

// Mock the hooks
jest.mock('../../map/api/useFetchHazardPins');
jest.mock('../api/useCheckoutFlight');
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Map: ({ children }: any) => <View testID="mock-map">{children}</View>,
    Camera: () => null,
    GeoJSONSource: ({ children, onPress }: any) => (
      <View testID="mock-geojson-source" onTouchEnd={() => {
        // Simple mock to trigger onPress for testing
        if (onPress) {
          onPress({ features: [{ properties: { id: 'pin-1' } }] });
        }
      }}>
        {children}
      </View>
    ),
    SymbolLayer: () => null,
    CircleLayer: () => null,
    RasterSource: ({ children }: any) => <View testID="mock-raster-source">{children}</View>,
    RasterLayer: () => null,
  };
});

describe('FlightCheckout Component', () => {
  const mockCheckoutFlight = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCheckoutFlight as jest.Mock).mockReturnValue({
      mutate: mockCheckoutFlight,
      isPending: false,
    });
  });

  it('renders loading state', () => {
    (useFetchHazardPins as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<FlightCheckout plotId="plot-1" bookingId="booking-1" />);
    // Testing library will find the ActivityIndicator inherently via tree traversal,
    // but we can just check it doesn't crash and text is not there.
    expect(screen.queryByText('Safety Check-Out')).toBeNull();
  });

  it('allows flight immediately if no hazard pins exist', () => {
    (useFetchHazardPins as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<FlightCheckout plotId="plot-1" bookingId="booking-1" />);
    
    expect(screen.getByText('No visual hazards reported for this plot.')).toBeTruthy();
    
    const beginButton = screen.getByText('Begin Flight');
    fireEvent.press(beginButton);

    expect(mockCheckoutFlight).toHaveBeenCalledWith(
      { bookingId: 'booking-1', acknowledgedHazards: [] },
      expect.any(Object)
    );
  });

  it('disables begin flight button until all pins are acknowledged', () => {
    (useFetchHazardPins as jest.Mock).mockReturnValue({
      data: [
        { id: 'pin-1', location: { type: 'Point', coordinates: [0, 0] }, description: 'Tree' }
      ],
      isLoading: false,
      error: null,
    });

    render(<FlightCheckout plotId="plot-1" bookingId="booking-1" />);
    
    expect(screen.getByText('Acknowledge all hazards to unlock flight (0/1)')).toBeTruthy();
    
    const beginButton = screen.getByText('Begin Flight');
    fireEvent.press(beginButton);
    
    // Should NOT have called mutation because button is logically disabled
    expect(mockCheckoutFlight).not.toHaveBeenCalled();

    // Simulate tapping the pin on the map (onTouchEnd is what the mock GeoJSONSource listens to)
    const source = screen.getByTestId('mock-geojson-source');
    fireEvent.touchEnd(source);

    // Now text should update to (1/1)
    expect(screen.getByText('Acknowledge all hazards to unlock flight (1/1)')).toBeTruthy();
    
    // Press button again
    fireEvent.press(beginButton);
    
    expect(mockCheckoutFlight).toHaveBeenCalledWith(
      { bookingId: 'booking-1', acknowledgedHazards: ['pin-1'] },
      expect.any(Object)
    );
  });
});
