import { ForecastData } from "./agromonitoring";

export interface DiseaseRiskAlert {
  disease: string;
  riskLevel: "Low" | "Moderate" | "High";
  triggerConditions: string;
  date: number; // timestamp when the risk is highest
}

export function evaluateDiseaseRisk(forecast: ForecastData[] | null): DiseaseRiskAlert[] {
  if (!forecast || forecast.length === 0) return [];

  const alerts: DiseaseRiskAlert[] = [];

  // Example Heuristic for Fungal Blight:
  // High Risk: Consecutive periods (e.g. over 6 hours) of Temp between 15-25°C and Humidity > 85%
  
  let blightRiskCount = 0;
  let highestRiskTime = 0;

  for (const item of forecast) {
    const tempC = item.main.temp - 273.15;
    const humidity = item.main.humidity;

    if (tempC >= 15 && tempC <= 25 && humidity > 85) {
      blightRiskCount++;
      highestRiskTime = item.dt;
    } else {
      // Reset if conditions break
      // blightRiskCount = 0;
    }
  }

  if (blightRiskCount >= 3) { // ~9 hours of favorable conditions
    alerts.push({
      disease: "Late Blight (Fungal)",
      riskLevel: "High",
      triggerConditions: "Prolonged high humidity (>85%) with moderate temperatures (15-25°C).",
      date: highestRiskTime
    });
  } else if (blightRiskCount >= 1) {
    alerts.push({
      disease: "Late Blight (Fungal)",
      riskLevel: "Moderate",
      triggerConditions: "Brief periods of high humidity and moderate temperatures.",
      date: highestRiskTime
    });
  }

  return alerts;
}
