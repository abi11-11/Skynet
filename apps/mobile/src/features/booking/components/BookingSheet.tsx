import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, Linking, Alert } from 'react-native';
import { SERVICES } from '../constants';
import { calculateAreaInAcres, calculateCost, calculateChemicalVolume } from '../utils/costCalculator';
import type { GeoJSONPolygon } from '@skynet/types';

interface BookingSheetProps {
  visible: boolean;
  onClose: () => void;
  plotId: string;
  plotArea: GeoJSONPolygon | string | null;
}

export default function BookingSheet({ visible, onClose, plotId, plotArea }: BookingSheetProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Parse area
  const parsedPolygon = useMemo(() => {
    if (!plotArea) return null;
    if (typeof plotArea === 'string') {
      try {
        return JSON.parse(plotArea) as GeoJSONPolygon;
      } catch {
        return null;
      }
    }
    return plotArea.type === 'Polygon' ? plotArea : null;
  }, [plotArea]);

  const acres = useMemo(() => {
    if (!parsedPolygon) return 0;
    return calculateAreaInAcres(parsedPolygon);
  }, [parsedPolygon]);

  const selectedService = SERVICES.find(s => s.id === selectedServiceId);
  const cost = selectedService ? calculateCost(acres, selectedService.ratePerAcre) : 0;
  const volume = selectedService ? calculateChemicalVolume(acres, selectedService.volumePerAcre) : 0;

  const handleCallSupport = () => {
    const phoneNumber = 'tel:+918000000000';
    Linking.openURL(phoneNumber).catch((err) => {
      console.error('Failed to open dialer', err);
      Alert.alert('Error', 'Unable to open the phone dialer on this device.');
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Book Drone Service</Text>
          <Text style={styles.subtitle}>Plot ID: {plotId}</Text>
          <Text style={styles.acres}>Area: {acres.toFixed(2)} Acres</Text>

          <Text style={styles.sectionTitle}>Select a Service:</Text>
          <FlatList
            data={SERVICES}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable 
                style={[styles.serviceCard, selectedServiceId === item.id && styles.serviceCardSelected]}
                onPress={() => setSelectedServiceId(item.id)}
              >
                <Text style={styles.serviceName}>{item.name}</Text>
                <Text style={styles.serviceRate}>₹{item.ratePerAcre}/Acre • {item.volumePerAcre}L/Acre</Text>
              </Pressable>
            )}
            style={styles.list}
          />

          {selectedService && (
            <View style={styles.quoteContainer}>
              <Text style={styles.quoteTitle}>Exact Quote</Text>
              <Text style={styles.quoteText}>Total Cost: ₹{cost.toFixed(2)}</Text>
              <Text style={styles.quoteText}>Chemical Required: {volume.toFixed(1)} L</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, !selectedService && styles.buttonDisabled]} disabled={!selectedService}>
              <Text style={styles.buttonText}>Confirm Booking</Text>
            </Pressable>
          </View>

          <Pressable style={styles.supportButton} onPress={handleCallSupport}>
            <Text style={styles.supportButtonText}>Need Help? Call Us</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  acres: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  serviceCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  serviceName: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '600',
  },
  serviceRate: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  quoteContainer: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 14,
    color: '#f8fafc',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#4b5563',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  supportButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
  },
  supportButtonText: {
    color: '#bfdbfe',
    fontWeight: '600',
    fontSize: 16,
  },
});
