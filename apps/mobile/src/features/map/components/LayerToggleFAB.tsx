import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export type LayerType = 'BASE' | 'NDVI' | 'WEATHER';

interface LayerToggleFABProps {
  activeLayer: LayerType;
  onLayerSelect: (layer: LayerType) => void;
  isLoading?: boolean;
}

export const LayerToggleFAB: React.FC<LayerToggleFABProps> = ({ 
  activeLayer, 
  onLayerSelect,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleSelect = (layer: LayerType) => {
    onLayerSelect(layer);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {isOpen && (
        <View style={styles.menu}>
          <TouchableOpacity 
            style={[styles.menuItem, activeLayer === 'BASE' && styles.activeItem]} 
            onPress={() => handleSelect('BASE')}
            testID="layer-base"
          >
            <Text style={styles.menuText}>Base Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, activeLayer === 'NDVI' && styles.activeItem]} 
            onPress={() => handleSelect('NDVI')}
            testID="layer-ndvi"
          >
            <Text style={styles.menuText}>NDVI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, activeLayer === 'WEATHER' && styles.activeItem]} 
            onPress={() => handleSelect('WEATHER')}
            testID="layer-weather"
          >
            <Text style={styles.menuText}>Weather</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={toggleMenu}
        testID="layer-fab"
      >
        {isLoading ? (
          <ActivityIndicator testID="layer-loader" size="small" color="#ffffff" />
        ) : (
          <Text style={styles.fabText}>🗺️</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
  },
  menu: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  activeItem: {
    backgroundColor: '#e6f2ff',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 24,
  }
});
