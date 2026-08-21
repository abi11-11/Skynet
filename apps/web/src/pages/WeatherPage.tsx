import { useState, useEffect } from "react";
import { getAssignedFarmPlots } from "../lib/farmPlots";
import { getCachedFarmPlots } from "../lib/cache";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import { getCurrentWeather, getCurrentSoilData, getWeatherForecast } from "../lib/agromonitoring";
import type { WeatherData, SoilData, ForecastData } from "../lib/agromonitoring";
import { evaluateDiseaseRisk } from "../lib/diseaseModeling";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CloudRain, Wind, Droplets, ThermometerSun, AlertTriangle, Sprout, Sunrise, Sunset, Loader2 } from "lucide-react";

export default function WeatherPage() {
  const [plots, setPlots] = useState<FarmPlot[] | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<FarmPlot | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[] | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await getAssignedFarmPlots();
      if (error) {
        const cached = getCachedFarmPlots();
        setPlots(cached ?? []);
        if (cached && cached.length > 0) setSelectedPlot(cached[0]);
      } else {
        setPlots(data ?? []);
        if (data && data.length > 0) setSelectedPlot(data[0]);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedPlot) {
      const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        let lat = 0, lon = 0;
        if (typeof selectedPlot.area !== "string" && selectedPlot.area?.type === "Polygon") {
          const coords = (selectedPlot.area as GeoJSONPolygon).coordinates[0][0];
          lon = coords[0];
          lat = coords[1];
        }
        
        try {
          const [weather, soil, forecast] = await Promise.all([
            getCurrentWeather(lat, lon),
            getCurrentSoilData(selectedPlot.id),
            getWeatherForecast(lat, lon)
          ]);
          setWeatherData(weather);
          setSoilData(soil);
          setForecastData(forecast);
        } catch (e) {
          console.error("Failed to fetch weather data", e);
        } finally {
          setLoadingAnalytics(false);
        }
      };
      fetchAnalytics();
    }
  }, [selectedPlot]);

  // Determine dynamic background gradient based on weather condition
  const getBackgroundGradient = () => {
    if (!weatherData) return "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
    const tempC = weatherData.main.temp - 273.15;
    const isRaining = weatherData.weather[0]?.main.toLowerCase().includes("rain");
    
    if (isRaining) return "linear-gradient(135deg, #1e293b 0%, #020617 100%)"; // Rainy/Dark
    if (tempC > 30) return "linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)"; // Hot/Sunny
    return "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)"; // Clear/Mild
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#020617", overflowY: "auto", position: "relative" }}>
      
      {/* Dynamic Background */}
      <motion.div 
        animate={{ background: getBackgroundGradient() }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      />

      {/* Header */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, backdropFilter: "blur(12px)", background: "rgba(0, 0, 0, 0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CloudRain size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#fff" }}>Weather & Analytics</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>Hyper-local climate intelligence</p>
          </div>
        </div>

        {plots && plots.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>Location:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.2)", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
              <MapPin size={16} color="#3b82f6" />
              <select 
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: "0.9rem", outline: "none", cursor: "pointer" }}
                value={selectedPlot?.id ?? ""}
                onChange={(e) => setSelectedPlot(plots.find(p => p.id === e.target.value) ?? null)}
              >
                {plots.map(p => (
                  <option key={p.id} value={p.id} style={{ color: "#000" }}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "32px", zIndex: 10 }}>
        {loading || loadingAnalytics ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", color: "var(--text-muted)" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Loader2 size={32} />
            </motion.div>
            <p style={{ marginTop: 16 }}>Syncing atmospheric data...</p>
          </div>
        ) : !selectedPlot ? (
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <CloudRain size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 8px", color: "#fff" }}>No Locations Available</h3>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Please add a farm plot to view local weather data.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="show"
            style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}
          >
            
            {/* HERO STAT: CURRENT WEATHER */}
            <motion.div variants={itemVariants} style={{ gridColumn: "span 12", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "40px", backdropFilter: "blur(20px)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              {weatherData ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                    <div style={{ fontSize: "5rem", fontWeight: 200, color: "#fff", lineHeight: 1 }}>
                      {(weatherData.main.temp - 273.15).toFixed(1)}°
                    </div>
                    <div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>
                        {weatherData.weather[0]?.description || "Clear"}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ThermometerSun size={14}/> Feels like {(weatherData.main.feels_like - 273.15).toFixed(1)}°</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Sunrise size={14}/> {new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Sunset size={14}/> {new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    style={{ background: "rgba(59, 130, 246, 0.1)", width: 120, height: 120, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {weatherData.weather[0]?.main.toLowerCase().includes("rain") 
                      ? <CloudRain size={64} color="#3b82f6" /> 
                      : <ThermometerSun size={64} color="#f59e0b" />}
                  </motion.div>
                </>
              ) : (
                <div style={{ color: "var(--text-muted)" }}>Current weather unavailable</div>
              )}
            </motion.div>

            {/* METRICS ROW */}
            <motion.div variants={itemVariants} className="weather-metric-card" style={{ gridColumn: "span 4", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, backdropFilter: "blur(12px)", transition: "transform 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
                <Droplets size={18} color="#38bdf8" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Humidity</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
                {weatherData?.main.humidity ?? "--"}%
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="weather-metric-card" style={{ gridColumn: "span 4", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, backdropFilter: "blur(12px)", transition: "transform 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
                <Wind size={18} color="#c084fc" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Wind Speed</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
                {weatherData?.wind.speed ?? "--"} <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)" }}>m/s</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="weather-metric-card" style={{ gridColumn: "span 4", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, backdropFilter: "blur(12px)", transition: "transform 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
                <Sprout size={18} color="#34d399" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Soil Moisture</span>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
                {soilData ? (soilData.moisture * 100).toFixed(1) : "--"}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                Temp (10cm): {soilData ? (soilData.t10 - 273.15).toFixed(1) + "°C" : "--"}
              </div>
            </motion.div>

            {/* DISEASE ALERTS & FORECAST LIST */}
            <motion.div variants={itemVariants} style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#fff" }}>Disease Risk Models</h3>
              {forecastData && evaluateDiseaseRisk(forecastData).length > 0 ? (
                evaluateDiseaseRisk(forecastData).map((alert, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    style={{ background: alert.riskLevel === "High" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)", border: `1px solid ${alert.riskLevel === "High" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`, borderRadius: 16, padding: 20, backdropFilter: "blur(12px)" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: alert.riskLevel === "High" ? "#fca5a5" : "#fcd34d" }}>
                        <AlertTriangle size={18} />
                        <strong style={{ fontSize: "1rem" }}>{alert.disease}</strong>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: alert.riskLevel === "High" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", color: alert.riskLevel === "High" ? "#fca5a5" : "#fcd34d" }}>
                        {alert.riskLevel} Risk
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                      {alert.triggerConditions}
                    </p>
                    <div style={{ marginTop: 12, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={12} /> Expected around {new Date(alert.date * 1000).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, textAlign: "center", backdropFilter: "blur(12px)" }}>
                  <Sprout size={32} color="#34d399" style={{ margin: "0 auto 12px", opacity: 0.8 }} />
                  <div style={{ color: "#fff", fontWeight: 500 }}>No disease risks detected</div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Conditions are not favorable for major pathogens.</div>
                </div>
              )}
            </motion.div>

            {/* 5-DAY RAIN FORECAST (SCROLLABLE) */}
            <motion.div variants={itemVariants} style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#fff" }}>5-Day Rainfall Outlook</h3>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)" }}>
                {forecastData && forecastData.length > 0 ? (
                  <div style={{ maxHeight: 300, overflowY: "auto", padding: "8px 0" }}>
                    {forecastData.filter(f => f.rain && f.rain["3h"]).map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: i !== forecastData.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <CloudRain size={20} color="#60a5fa" />
                          <div>
                            <div style={{ color: "#fff", fontSize: "0.95rem" }}>{new Date(f.dt * 1000).toLocaleDateString("en-US", { weekday: "long" })}</div>
                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>{new Date(f.dt * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>{(f.main.temp - 273.15).toFixed(1)}°C</div>
                          <div style={{ fontWeight: 600, color: "#60a5fa", width: 60, textAlign: "right" }}>{f.rain?.["3h"]?.toFixed(1)} mm</div>
                        </div>
                      </div>
                    ))}
                    {forecastData.filter(f => f.rain && f.rain["3h"]).length === 0 && (
                       <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.6)" }}>No rain expected in the next 5 days.</div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.6)" }}>Forecast data unavailable</div>
                )}
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
