import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LayerToggleFAB } from './LayerToggleFAB';

describe('LayerToggleFAB', () => {
  it('should render the FAB closed by default', () => {
    const { getByTestId, queryByText } = render(
      <LayerToggleFAB activeLayer="BASE" onLayerSelect={jest.fn()} />
    );
    
    expect(getByTestId('layer-fab')).toBeTruthy();
    expect(queryByText('NDVI')).toBeNull();
  });

  it('should open menu when FAB is tapped', () => {
    const { getByTestId, getByText } = render(
      <LayerToggleFAB activeLayer="BASE" onLayerSelect={jest.fn()} />
    );
    
    fireEvent.press(getByTestId('layer-fab'));
    expect(getByText('NDVI')).toBeTruthy();
    expect(getByText('Weather')).toBeTruthy();
  });

  it('should call onLayerSelect and close menu when a layer is selected', () => {
    const mockOnSelect = jest.fn();
    const { getByTestId, queryByText } = render(
      <LayerToggleFAB activeLayer="BASE" onLayerSelect={mockOnSelect} />
    );
    
    fireEvent.press(getByTestId('layer-fab'));
    fireEvent.press(getByTestId('layer-ndvi'));
    
    expect(mockOnSelect).toHaveBeenCalledWith('NDVI');
    expect(queryByText('NDVI')).toBeNull(); // menu closed
  });

  it('should display loading spinner when isLoading is true', () => {
    const { getByTestId } = render(
      <LayerToggleFAB activeLayer="BASE" onLayerSelect={jest.fn()} isLoading={true} />
    );
    
    expect(getByTestId('layer-loader')).toBeTruthy();
  });
});
