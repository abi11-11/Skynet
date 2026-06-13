import { useState } from "react";
import { StyleSheet, View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { supabase } from "../src/lib/supabase";
import { fetchAssignedFarmPlots } from "../src/lib/farmPlots";
import { saveFarmPlots, getCachedFarmPlots } from "../src/lib/cache";
import BoundaryMapStub from "../src/components/BoundaryMap";
import type { FarmPlot } from "@skynet/types";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plots, setPlots] = useState<FarmPlot[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(false);

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

    if (data) {
      await saveFarmPlots(data);
    }
    setPlots(data);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
      <Pressable style={[styles.button, styles.fetchButton]} onPress={handleLoadPlots} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Loading plots…" : "Load Assigned Plots"}</Text>
      </Pressable>
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
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#292524",
    padding: 24,
    justifyContent: "center",
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
});
