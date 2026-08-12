import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Map,
  Camera,
  GeoJSONSource,
  Layer,
  SymbolLayer,
  CircleLayer,
  type MapProps,
} from '@maplibre/maplibre-react-native';
import { useCreateHazardPin } from '../../telemetry/api/useCreateHazardPin';
import { useFetchHazardPins } from '../../map/api/useFetchHazardPins';
import { useFetchActiveBooking } from '../../booking/api/useFetchActiveBooking';
import { useEmergencyCall } from '../../booking/api/useEmergencyCall';

type Props = {
  plotId: string;
  /** Optional initial map center as [longitude, latitude]. Defaults to geographic center of India. */
  initialCenter?: [number, number];
};

// MapLibre v11 long-press event geometry shape (from native bridge)
type LongPressEvent = {
  geometry?: {
    type: 'Point';
    coordinates: [number, number];
  };
};

export default function HazardAnnotationOverlay({
  plotId,
  initialCenter = [78.9629, 20.5937], // Geographic center of India
}: Props) {
  const [pendingLocation, setPendingLocation] = useState<[number, number] | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  const { mutate: createHazardPin, isPending } = useCreateHazardPin();
  const { mutate: initiateEmergencyCall, isPending: isCalling } = useEmergencyCall();
  const { data: hazardPins } = useFetchHazardPins(plotId);
  const { data: activeBooking } = useFetchActiveBooking(plotId);

  const [pulseRadius, setPulseRadius] = useState(14);
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseRadius((r) => (r === 14 ? 18 : 14));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // ──────────────────────────────────────────────
  // Step 1: User long-presses the map → confirm
  // MapLibre emits coordinates as [longitude, latitude] — GeoJSON standard ✓
  // ──────────────────────────────────────────────
  const handleMapLongPress: MapProps['onLongPress'] = (event) => {
    if (isPending) return;

    // Cast to access the geometry coordinates from the native bridge event
    const coords = (event as unknown as LongPressEvent).geometry?.coordinates;
    if (!coords || coords.length < 2) return;

    const [lng, lat] = coords;
    setPendingLocation([lng, lat]);

    Alert.alert(
      'Drop Hazard Pin?',
      `Location: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E\n\nDocument this hazard?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setPendingLocation(null),
        },
        { text: 'Take Photo', onPress: () => handleTakePhoto([lng, lat]) },
        {
          text: 'Pin Only',
          onPress: () => submitHazard([lng, lat], undefined),
        },
      ]
    );
  };

  // ──────────────────────────────────────────────
  // Step 2: Camera picker
  // ──────────────────────────────────────────────
  const handleTakePhoto = async (location: [number, number]) => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Camera access is needed to photograph hazards.');
      setPendingLocation(null);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      submitHazard(location, uri);
    } else {
      setPendingLocation(null);
    }
  };

  // ──────────────────────────────────────────────
  // Step 3: Submit (compression + DB insert handled in hook)
  // ──────────────────────────────────────────────
  const submitHazard = (location: [number, number], uri?: string) => {
    createHazardPin(
      {
        plot_id: plotId,
        location,
        description: 'Field hazard',
        localImageUri: uri,
      },
      {
        onSuccess: (result) => {
          if (!result || ('error' in result && result.error)) return;
          Alert.alert('✅ Hazard Pinned', 'Saved successfully.');
          setPendingLocation(null);
          setPhotoUri(null);
        },
      }
    );
  };

  // GeoJSON FeatureCollection for the pending pin marker
  const pendingGeoJSON: GeoJSON.FeatureCollection | undefined = pendingLocation
    ? {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: pendingLocation },
            properties: {},
          },
        ],
      }
    : undefined;

  // Render existing pins and calculate "Unsynced" status
  const existingPinsGeoJSON = React.useMemo(() => {
    if (!hazardPins) return undefined;

    const checkoutTime = activeBooking?.checkout_signature 
      ? new Date(activeBooking.checkout_signature).getTime() 
      : null;

    const features = hazardPins
      .filter((pin) => pin.location && typeof pin.location !== 'string')
      .map((pin) => {
        const pinTime = new Date(pin.created_at).getTime();
        // A pin is unsynced if the pilot checked out BEFORE the pin was created
        const isUnsynced = checkoutTime !== null && pinTime > checkoutTime;
        
        return {
          type: 'Feature' as const,
          id: pin.id,
          geometry: pin.location as GeoJSON.Point,
          properties: {
            id: pin.id,
            description: isUnsynced ? 'UNSYNCED HAZARD' : pin.description || 'Hazard',
            isUnsynced,
            // Pulsing red for unsynced, blue/gray for normal
            color: isUnsynced ? '#ef4444' : '#3b82f6',
          },
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [hazardPins, activeBooking]);

  const handleExistingPinPress = (event: any) => {
    const feature = event?.features?.[0];
    if (!feature || !feature.properties?.id) return;

    if (feature.properties.isUnsynced && activeBooking?.id) {
      Alert.alert(
        '⚠️ Unsynced Hazard',
        'The pilot already checked out before you dropped this pin. They may crash into it!',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call Pilot Now', 
            style: 'destructive',
            onPress: () => {
              initiateEmergencyCall(
                { bookingId: activeBooking.id, hazardId: feature.properties.id },
                {
                  onSuccess: () => Alert.alert('Call Initiated', 'Connecting you to the pilot...'),
                  onError: (err) => Alert.alert('Call Failed', err.message),
                }
              );
            }
          }
        ]
      );
    }
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {isPending
          ? '⏳ Uploading hazard…'
          : '📍 Long-press the map to drop a hazard pin'}
      </Text>

      <Map
        style={styles.map}
        mapStyle="https://demotiles.maplibre.org/style.json"
        onLongPress={handleMapLongPress}
      >
        <Camera centerCoordinate={initialCenter} zoomLevel={10} />

        {pendingGeoJSON && (
          <GeoJSONSource id="pending-hazard" data={pendingGeoJSON}>
            <Layer
              id="pending-hazard-circle"
              type="circle"
              style={{
                circleRadius: 10,
                circleColor: isPending ? '#fcd34d' : '#ef4444',
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </GeoJSONSource>
        )}

        {existingPinsGeoJSON && existingPinsGeoJSON.features.length > 0 && (
          <GeoJSONSource id="existing-hazards" data={existingPinsGeoJSON} onPress={handleExistingPinPress}>
            <SymbolLayer
              id="existing-hazards-layer"
              style={{
                iconImage: 'marker',
                textField: ['get', 'description'],
                textOffset: [0, 1.5],
                textColor: ['get', 'color'],
                iconSize: 1.5,
              }}
            />
            <CircleLayer
              id="existing-hazards-circle"
              style={{
                circleRadius: ['case', ['get', 'isUnsynced'], pulseRadius, 10], // Larger if unsynced
                circleColor: ['get', 'color'],
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </GeoJSONSource>
        )}
      </Map>

      {(isPending || isCalling) && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color="#10b981" />
          <Text style={styles.uploadText}>{isCalling ? 'Initiating emergency call…' : 'Saving hazard pin…'}</Text>
          {photoUri && !isCalling && (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  map: {
    height: 220,
    width: '100%',
  },
  uploadOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#111827',
  },
  uploadText: {
    color: '#fcd34d',
    fontSize: 13,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 'auto',
  },
});
