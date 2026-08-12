import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Map, Camera, GeoJSONSource, SymbolLayer, CircleLayer, RasterSource, RasterLayer } from '@maplibre/maplibre-react-native';
import { useFetchHazardPins } from '../../map/api/useFetchHazardPins';
import { useCheckoutFlight } from '../api/useCheckoutFlight';
import { LayerToggleFAB, LayerType } from '../../map/components/LayerToggleFAB';
import { getSentinelHubWmsUrl } from '../../../lib/wmsConfig';

type Props = {
  plotId: string;
  bookingId: string;
  initialCenter?: [number, number];
  onCheckoutComplete?: () => void;
};

export default function FlightCheckout({
  plotId,
  bookingId,
  initialCenter = [78.9629, 20.5937],
  onCheckoutComplete,
}: Props) {
  const { data: hazardPins, isLoading: pinsLoading, error: pinsError } = useFetchHazardPins(plotId);
  const { mutate: checkoutFlight, isPending: isCheckingOut } = useCheckoutFlight();
  
  const [acknowledgedPinIds, setAcknowledgedPinIds] = useState<Set<string>>(new Set());
  
  const [activeLayer, setActiveLayer] = useState<LayerType>('BASE');
  const [isLayerLoading, setIsLayerLoading] = useState(false);
  const layerLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLayerSelect = (layer: LayerType) => {
    if (layer !== activeLayer) {
      // Clear any existing fallback timeout from a previous toggle
      if (layerLoadTimeoutRef.current) {
        clearTimeout(layerLoadTimeoutRef.current);
        layerLoadTimeoutRef.current = null;
      }

      setIsLayerLoading(layer !== 'BASE'); // Base loads instantly
      setActiveLayer(layer);
      
      // Fallback timeout in case onDidFinishRenderingMapFully fails to fire (e.g., tile network error)
      if (layer !== 'BASE') {
        layerLoadTimeoutRef.current = setTimeout(() => {
          setIsLayerLoading(false);
          layerLoadTimeoutRef.current = null;
        }, 5000);
      }
    }
  };

  // Convert fetched pins to a GeoJSON FeatureCollection
  const pinsGeoJSON = useMemo(() => {
    if (!hazardPins) return undefined;
    
    const features = hazardPins
      .filter((pin) => pin.location && typeof pin.location === 'object' && 'type' in pin.location && pin.location.type === 'Point') // strict guard for parsed geojson
      .map((pin) => {
        const isAcknowledged = acknowledgedPinIds.has(pin.id);
        return {
          type: 'Feature' as const,
          id: pin.id,
          geometry: pin.location as GeoJSON.Point,
          properties: {
            id: pin.id,
            description: pin.description,
            acknowledged: isAcknowledged,
            // Use different color based on acknowledgement status
            color: isAcknowledged ? '#10b981' : '#ef4444', 
          },
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [hazardPins, acknowledgedPinIds]);

  const handlePinPress = (event: any) => {
    const feature = event?.features?.[0];
    if (!feature || !feature.properties?.id) return;
    
    const pinId = feature.properties.id;
    
    // One-way acknowledgement — once a hazard is seen, it cannot be un-acknowledged.
    setAcknowledgedPinIds((prev) => {
      if (prev.has(pinId)) return prev; // already acknowledged, no change
      const next = new Set(prev);
      next.add(pinId);
      return next;
    });
  };

  // Reset acknowledgements whenever the pilot switches to a different plot.
  useEffect(() => {
    setAcknowledgedPinIds(new Set());
  }, [plotId]);

  // Cleanup fallback timeout on unmount to prevent state updates on unmounted component.
  useEffect(() => {
    return () => {
      if (layerLoadTimeoutRef.current) {
        clearTimeout(layerLoadTimeoutRef.current);
      }
    };
  }, []);

  const handleBeginFlight = () => {
    if (!hazardPins) return;

    // Compare against renderable pins only (those with parsed GeoJSON locations).
    // Use the same validAcknowledgedCount logic as the render phase to avoid divergence.
    const renderablePinCount = pinsGeoJSON?.features.length ?? 0;
    const currentRenderablePinIds = new Set(pinsGeoJSON?.features.map(f => f.id) || []);
    const currentValidAcknowledgedCount = Array.from(acknowledgedPinIds).filter(id => currentRenderablePinIds.has(id)).length;
    if (currentValidAcknowledgedCount < renderablePinCount) {
      Alert.alert('Safety Check Incomplete', 'You must acknowledge all hazard pins before flying.');
      return;
    }

    checkoutFlight(
      {
        bookingId,
        acknowledgedHazards: Array.from(acknowledgedPinIds),
      },
      {
        onSuccess: () => {
          Alert.alert(
            '✅ Flight Unlocked', 
            'Hazards acknowledged and signature recorded.',
            [{ text: 'OK', onPress: () => onCheckoutComplete?.() }]
          );
        },
        onError: (err) => {
          Alert.alert('Checkout Failed', err.message);
        },
      }
    );
  };

  if (pinsLoading) {
    return <ActivityIndicator style={styles.loader} color="#10b981" />;
  }

  if (pinsError) {
    return <Text style={styles.errorText}>Failed to load hazards.</Text>;
  }

  // Renderable pin count drives the acknowledgement counter shown to the pilot.
  const totalPins = pinsGeoJSON?.features.length ?? 0;
  const renderablePinIds = new Set(pinsGeoJSON?.features.map(f => f.id) || []);
  
  // Calculate how many *currently valid* pins have been acknowledged (prevents stale IDs bypassing safety check)
  const validAcknowledgedCount = Array.from(acknowledgedPinIds).filter(id => renderablePinIds.has(id)).length;
  const allAcknowledged = totalPins > 0 && validAcknowledgedCount === totalPins;
  
  // Safety gate: allow flight if all renderable pins are acknowledged, or if there are zero renderable pins
  const canFly = totalPins === 0 || allAcknowledged;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Safety Check-Out</Text>
        <Text style={styles.subtitle}>
          {totalPins === 0 
            ? 'No visual hazards reported for this plot.'
            : `Acknowledge all hazards to unlock flight (${validAcknowledgedCount}/${totalPins})`}
        </Text>
      </View>

      <Map 
        style={styles.map} 
        mapStyle="https://demotiles.maplibre.org/style.json"
        onDidFinishRenderingMapFully={() => {
          if (layerLoadTimeoutRef.current) {
            clearTimeout(layerLoadTimeoutRef.current);
            layerLoadTimeoutRef.current = null;
          }
          setIsLayerLoading(false);
        }}
      >
        <Camera centerCoordinate={initialCenter} zoomLevel={14} />

        {pinsGeoJSON && pinsGeoJSON.features.length > 0 && (
          <GeoJSONSource id="hazard-pins-source" data={pinsGeoJSON} onPress={handlePinPress}>
            <SymbolLayer
              id="hazard-pins-layer"
              style={{
                iconImage: 'marker', // Requires adding a marker image to the style or using circle
                textField: ['get', 'description'],
                textOffset: [0, 1.5],
                textColor: ['get', 'color'],
                iconSize: 1.5,
              }}
            />
            {/* CircleLayer renders the coloured dot behind the label */}
            <CircleLayer
              id="hazard-pins-circle"
              style={{
                circleRadius: 12,
                circleColor: ['get', 'color'],
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </GeoJSONSource>
        )}
        
        {activeLayer !== 'BASE' && (
          <RasterSource 
            key={`wms-source-${activeLayer}`}
            id={`wms-source-${activeLayer}`} 
            tileUrlTemplates={[getSentinelHubWmsUrl(activeLayer)]} 
            tileSize={256}
          >
            <RasterLayer 
              id={`wms-layer-${activeLayer}`} 
              sourceID={`wms-source-${activeLayer}`} 
              {...(pinsGeoJSON && pinsGeoJSON.features.length > 0 ? { belowLayerID: 'hazard-pins-circle' } : {})}
            />
          </RasterSource>
        )}
      </Map>

      <LayerToggleFAB 
        activeLayer={activeLayer} 
        onLayerSelect={handleLayerSelect} 
        isLoading={isLayerLoading}
      />

      <Pressable 
        style={[styles.button, !canFly && styles.buttonDisabled]} 
        onPress={handleBeginFlight}
        disabled={!canFly || isCheckingOut}
      >
        <Text style={styles.buttonText}>
          {isCheckingOut ? 'Recording Signature...' : 'Begin Flight'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#111827',
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  map: {
    height: 250,
    width: '100%',
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    margin: 24,
  },
  errorText: {
    color: '#ef4444',
    padding: 16,
  },
});
