import { useState } from "react";
import { useAuth } from "../App";

const mockPlots = [
  { id: "p1", name: "Plot C-2", crop: "Corn", area: "120 acres" },
  { id: "p2", name: "Plot A-1", crop: "Soybeans", area: "85 acres" },
  { id: "p3", name: "Plot B-3", crop: "Wheat", area: "210 acres" },
];

const mockHealthData: Record<string, any> = {
  "p1": {
    ndvi: 0.82,
    ndre: 0.75,
    evi: 0.68,
    status: "Healthy",
    summary: "Vegetative indices show strong growth. No significant stress detected.",
    alerts: [
      { type: "info", text: "Optimal harvest window approaching in 14 days." }
    ]
  },
  "p2": {
    ndvi: 0.45,
    ndre: 0.40,
    evi: 0.35,
    status: "Stressed",
    summary: "Significant drop in NDVI observed in the southeast quadrant.",
    alerts: [
      { type: "critical", text: "Moisture stress detected. Irrigation recommended." },
      { type: "warning", text: "Possible pest infestation (aphids) based on canopy analysis." }
    ]
  },
  "p3": {
    ndvi: 0.65,
    ndre: 0.60,
    evi: 0.55,
    status: "Moderate",
    summary: "Growth is average. Some uneven emergence in the northern section.",
    alerts: [
      { type: "warning", text: "Nitrogen deficiency suspected. Consider variable rate application." }
    ]
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Healthy": return "var(--green)";
    case "Moderate": return "var(--amber)";
    case "Stressed": return "var(--red)";
    default: return "var(--text-muted)";
  }
};

const getAlertIcon = (type: string) => {
  switch (type) {
    case "critical": return "🚨";
    case "warning": return "⚠️";
    case "info": return "ℹ️";
    default: return "🔹";
  }
};

const getAlertColor = (type: string) => {
  switch (type) {
    case "critical": return "var(--red)";
    case "warning": return "var(--amber)";
    case "info": return "var(--blue)";
    default: return "var(--text-primary)";
  }
};

const getAlertBg = (type: string) => {
  switch (type) {
    case "critical": return "rgba(239,68,68,0.1)";
    case "warning": return "rgba(245,158,11,0.1)";
    case "info": return "rgba(59,130,246,0.1)";
    default: return "var(--bg-subtle)";
  }
};


export default function CropHealthPage() {
  const { user } = useAuth();
  const [selectedPlotId, setSelectedPlotId] = useState(mockPlots[0].id);
  
  const healthData = mockHealthData[selectedPlotId];
  const selectedPlot = mockPlots.find(p => p.id === selectedPlotId);
  const isRagEnabled = localStorage.getItem("skynet_rag_automation") !== "false";

  return (
    <>
      <div className="page-header">
        <h2>AI Agronomist: Crop Health</h2>
        <p>Automated analysis of vegetative indices, weather data, and crop vitality.</p>
        <div style={{ marginTop: 10, fontSize: "0.85rem", color: isRagEnabled ? "var(--blue)" : "var(--text-muted)", display: 'flex', alignItems: 'center', gap: 6 }}>
           <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: isRagEnabled ? 'var(--blue)' : 'var(--text-muted)'}}></span>
           {isRagEnabled ? "RAG Automation Active: Background data sync is enabled." : "RAG Automation Disabled: Data sync is paused."}
        </div>
      </div>
      <div className="page-body">
        
        {/* Plot Selector */}
        <div className="flex gap-12 mb-24" style={{ overflowX: 'auto', paddingBottom: 8 }}>
          {mockPlots.map(plot => (
            <button 
              key={plot.id}
              onClick={() => setSelectedPlotId(plot.id)}
              className={`card ${selectedPlotId === plot.id ? 'active' : ''}`}
              style={{
                flex: '0 0 auto',
                minWidth: 200,
                padding: '12px 16px',
                border: selectedPlotId === plot.id ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{plot.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plot.crop} • {plot.area}</div>
              
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6}}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getStatusColor(mockHealthData[plot.id].status) }}></div>
                 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: getStatusColor(mockHealthData[plot.id].status) }}>
                   {mockHealthData[plot.id].status}
                 </span>
              </div>
            </button>
          ))}
        </div>

        {healthData && selectedPlot && (
          <div className="grid-2">
            
            {/* Left Column: AI Summary & Alerts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* AI Summary Card */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🤖</span>
                  <h3 className="card-title">AI Agronomist Summary</h3>
                </div>
                <div className="card-body">
                   <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                     {healthData.summary}
                   </p>
                </div>
              </div>

              {/* Alerts Card */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Active Alerts & Recommendations</h3>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {healthData.alerts.length > 0 ? (
                    healthData.alerts.map((alert: any, index: number) => (
                      <div 
                        key={index} 
                        style={{ 
                          padding: 12, 
                          borderRadius: 8, 
                          backgroundColor: getAlertBg(alert.type),
                          borderLeft: `4px solid ${getAlertColor(alert.type)}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12
                        }}
                      >
                         <span style={{ fontSize: '1.1rem' }}>{getAlertIcon(alert.type)}</span>
                         <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                           {alert.text}
                         </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No active alerts for this plot.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Indices */}
            <div className="card">
               <div className="card-header">
                 <h3 className="card-title">Vegetative Indices</h3>
               </div>
               <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 
                 {/* NDVI */}
                 <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>NDVI</span>
                     <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{healthData.ndvi.toFixed(2)}</span>
                   </div>
                   <div style={{ height: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, overflow: 'hidden' }}>
                     <div style={{ 
                       height: '100%', 
                       width: `${healthData.ndvi * 100}%`, 
                       backgroundColor: healthData.ndvi > 0.7 ? 'var(--green)' : healthData.ndvi > 0.4 ? 'var(--amber)' : 'var(--red)',
                       transition: 'width 0.5s ease-out'
                     }}></div>
                   </div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                     Normalized Difference Vegetation Index
                   </div>
                 </div>

                 {/* NDRE */}
                 <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>NDRE</span>
                     <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{healthData.ndre.toFixed(2)}</span>
                   </div>
                   <div style={{ height: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, overflow: 'hidden' }}>
                     <div style={{ 
                       height: '100%', 
                       width: `${healthData.ndre * 100}%`, 
                       backgroundColor: healthData.ndre > 0.6 ? 'var(--green)' : healthData.ndre > 0.35 ? 'var(--amber)' : 'var(--red)',
                       transition: 'width 0.5s ease-out'
                     }}></div>
                   </div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                     Normalized Difference Red Edge (canopy nitrogen)
                   </div>
                 </div>

                 {/* EVI */}
                 <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>EVI</span>
                     <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{healthData.evi.toFixed(2)}</span>
                   </div>
                   <div style={{ height: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, overflow: 'hidden' }}>
                     <div style={{ 
                       height: '100%', 
                       width: `${healthData.evi * 100}%`, 
                       backgroundColor: healthData.evi > 0.5 ? 'var(--green)' : healthData.evi > 0.3 ? 'var(--amber)' : 'var(--red)',
                       transition: 'width 0.5s ease-out'
                     }}></div>
                   </div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                     Enhanced Vegetation Index (high biomass areas)
                   </div>
                 </div>

               </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
