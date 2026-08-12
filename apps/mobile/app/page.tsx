import { useState } from "react";
import { StyleSheet, View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { supabase } from "../src/lib/supabase";
import { fetchAssignedFarmPlots } from "../src/lib/farmPlots";
import { saveFarmPlots, getCachedFarmPlots } from "../src/lib/cache";
import BoundaryMapStub from "../src/components/BoundaryMap";
import HazardAnnotationOverlay from "../src/features/map/components/HazardAnnotationOverlay";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSyncHazardPins } from "../src/store/useSyncHazardPins";
import FlightCheckout from "../src/features/booking/components/FlightCheckout";
import BookingSheet from "../src/features/booking/components/BookingSheet";
import type { FarmPlot } from "@skynet/types";
import { usePushNotifications } from "../src/features/telemetry/hooks/usePushNotifications";
import * as Linking from "expo-linking";
import { useEffect } from "react";

export default function Page() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

/** Inner component so hooks (useSyncHazardPins) can access the QueryClient context */
function AppContent() {
  const { pendingCount } = useSyncHazardPins();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plots, setPlots] = useState<FarmPlot[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pilotMode, setPilotMode] = useState(false);
  const [mockBookingId, setMockBookingId] = useState<string | null>(null);
  const [bookingPlotId, setBookingPlotId] = useState<string | null>(null);

  // Initialize Push Notifications
  usePushNotifications();

  // Handle Deep Links
  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      const parsed = Linking.parse(url);
      if ((parsed.hostname === 'booking' || parsed.path === 'booking') && parsed.queryParams?.plotId) {
        setBookingPlotId(parsed.queryParams.plotId as string);
        if (!plots) {
          handleLoadPlots();
        }
      }
    }
  }, [url]);

  const selectedPlotForBooking = plots?.find(p => p.id === bookingPlotId);

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Authentication failed", error.message);
      return;
    }

    Alert.alert("Signed in", `Session persisted securely for ${data.session?.user?.email ?? "user"}`);
  };

  const handleLoadPlots = async () => {
    setLoading(true);
    setFetchError(null);
    setOfflineMode(false);
    const { data, error } = await fetchAssignedFarmPlots();
    setLoading(false);

    if (error) {
      const cached = await getCachedFarmPlots();
      if (cached && cached.length > 0) {
        setPlots(cached);
        setOfflineMode(true);
        setFetchError("Network unavailable. Showing offline data.");
      } else {
        setFetchError(error.message);
      }
      return;
    }

    if (data && data.length > 0) {
      await saveFarmPlots(data);
      // Fetch a mock booking for the first plot for testing Pilot View
      if (data.length > 0) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id')
          .eq('plot_id', data[0].id)
          .limit(1)
          .maybeSingle();
        
        if (bookingData) {
          setMockBookingId(bookingData.id);
        } else {
          // Create a mock booking on the fly if none exists.
          // pilot_id must be set so the RLS update_bookings policy allows checkout.
          const { data: { user } } = await supabase.auth.getUser();
          // NOTE: RLS on bookings now restricts INSERT to is_plot_owner_or_manager only.
          // This self-insert will be blocked for pilot-role users. A farm manager must
          // create the booking via the manager flow or seed data before pilot mode works.
          const { data: newBooking, error } = await supabase
            .from('bookings')
            .insert({ plot_id: data[0].id, pilot_id: user?.id ?? null, status: 'pending' })
            .select('id')
            .maybeSingle();
          if (newBooking) {
            setMockBookingId(newBooking.id);
          } else {
            console.warn("Mock booking insert failed (expected for pilots). Using local fake ID.");
            setMockBookingId("mock-booking-" + data[0].id);
          }
        }
      }
    }
    setPlots(data);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#292524" }}>
      <ScrollView contentContainerStyle={styles.container}>
      {/* Offline sync banner — appears when hazard pins are queued for sync */}
      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            ⏳ {pendingCount} hazard pin{pendingCount > 1 ? 's' : ''} pending sync
          </Text>
        </View>
      )}
      <Text style={styles.title}>Skynet Platform Foundation</Text>
      <Text style={styles.subtitle}>Secure Supabase auth with Expo Secure Store</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94a3b8"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
      
      <View style={styles.row}>
        <Pressable style={[styles.button, styles.fetchButton, { flex: 1, marginRight: 8 }]} onPress={handleLoadPlots} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Loading…" : "Load Plots"}</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, { flex: 1, backgroundColor: pilotMode ? '#8b5cf6' : '#4b5563' }]} 
          onPress={() => setPilotMode(!pilotMode)}
        >
          <Text style={styles.buttonText}>{pilotMode ? "Pilot Mode" : "Manager Mode"}</Text>
        </Pressable>
      </View>

      {fetchError ? <Text style={styles.error}>{fetchError}</Text> : null}
      {plots ? (
        <View style={styles.plotsContainer}>
          <Text style={styles.sectionTitle}>
            Assigned Farm Plots {offlineMode ? "(Offline)" : ""}
          </Text>
          {plots.length === 0 ? (
            <Text style={styles.description}>No plots assigned.</Text>
          ) : (
            plots.map((plot) => {
              const polygon = typeof plot.area !== "string" && plot.area?.type === "Polygon" ? plot.area : null;
              const vertexCount = polygon?.coordinates?.[0]?.length ?? null;

              return (
                <View key={plot.id} style={styles.plotCard}>
                  <Text style={styles.plotName}>{plot.name}</Text>
                  <Text style={styles.description}>{plot.description ?? "No description"}</Text>
                  <Text style={styles.meta}>Plot ID: {plot.id}</Text>
                  <Text style={styles.meta}>Boundary type: {polygon ? "Polygon" : "raw"}</Text>
                  {vertexCount !== null ? <Text style={styles.meta}>Vertices: {vertexCount}</Text> : null}
                  {polygon ? <BoundaryMapStub polygon={polygon} /> : null}
                  
                  {pilotMode && mockBookingId && plot.id === plots[0].id ? (
                    <FlightCheckout plotId={plot.id} bookingId={mockBookingId} />
                  ) : (
                    <View>
                      <HazardAnnotationOverlay plotId={plot.id} />
                      <Pressable style={[styles.button, styles.bookButton]} onPress={() => setBookingPlotId(plot.id)}>
                        <Text style={styles.buttonText}>Book Service</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : null}

      <BookingSheet 
        visible={!!bookingPlotId} 
        onClose={() => setBookingPlotId(null)} 
        plotId={selectedPlotForBooking?.id || ''} 
        plotArea={selectedPlotForBooking?.area || null} 
      />
      </ScrollView>
      {plots && (
        <View style={styles.fabContainer}>
          <Pressable style={styles.fab}><Text style={styles.fabText}>🗺️</Text></Pressable>
          <Pressable style={styles.fab}><Text style={styles.fabText}>📍</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#292524",
    padding: 24,
    justifyContent: "center",
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  syncBanner: {
    backgroundColor: "#78350f",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#fcd34d",
  },
  syncBannerText: {
    color: "#fef3c7",
    fontWeight: "600",
    fontSize: 13,
  },
  title: {
    color: "#10B981",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    color: "#E5E7EB",
    fontSize: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#1F2937",
    color: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  fetchButton: {
    backgroundColor: "#2563eb",
  },
  buttonText: {
    color: "#111827",
    fontWeight: "700",
  },
  bookButton: {
    marginTop: 12,
    backgroundColor: "#3b82f6",
  },
  error: {
    marginTop: 12,
    color: "#fca5a5",
  },
  plotsContainer: {
    marginTop: 20,
    backgroundColor: "#1f2937",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    color: "#10b981",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    color: "#cbd5e1",
    marginBottom: 12,
  },
  plotCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  plotName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  meta: {
    color: "#94a3b8",
    fontSize: 12,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    gap: 16,
  },
  fab: {
    width: 56,
    height: 56,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 20,
  },
});
