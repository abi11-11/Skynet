import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./TraceabilityProfilePage.css";

interface TraceabilityData {
  batch_number: string;
  harvest_date: string;
  total_yield_kg: number;
  quality_grade: string;
  plot: {
    name: string;
    crop_type: string;
    tenant: {
      name: string;
    };
  };
}

export default function TraceabilityProfilePage() {
  const { batchNumber } = useParams<{ batchNumber: string }>();
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTraceability() {
      if (!batchNumber) return;
      try {
        const { data, error } = await supabase
          .from("harvest_batches")
          .select(`
            batch_number,
            harvest_date,
            total_yield_kg,
            quality_grade,
            plot:farm_plots (
              name,
              crop_type,
              tenant:tenants (
                name
              )
            )
          `)
          .eq("batch_number", batchNumber)
          .single();

        if (error) throw error;
        if (data) {
          setData(data as unknown as TraceabilityData);
        } else {
          setError("Batch not found.");
        }
      } catch (err: any) {
        console.error("Error fetching traceability data:", err);
        setError("Could not load traceability data.");
      } finally {
        setLoading(false);
      }
    }
    fetchTraceability();
  }, [batchNumber]);

  if (loading) {
    return <div className="traceability-page loading">Loading Traceability Data...</div>;
  }

  if (error || !data) {
    return (
      <div className="traceability-page error">
        <h1>Invalid or Missing Batch</h1>
        <p>{error || "This QR code does not match any known harvest batch in our system."}</p>
      </div>
    );
  }

  return (
    <div className="traceability-page">
      <div className="traceability-card glass-panel">
        <div className="traceability-header">
          <h1>Skynet Verified Origin</h1>
          <div className="badge">✓ Authentic</div>
        </div>
        
        <div className="traceability-body">
          <div className="detail-group">
            <label>Origin Farm / Tenant</label>
            <p>{data.plot.tenant?.name || "Unknown Farm"}</p>
          </div>
          
          <div className="detail-group">
            <label>Plot Name</label>
            <p>{data.plot.name}</p>
          </div>

          <div className="detail-group">
            <label>Crop Type</label>
            <p className="capitalize">{data.plot.crop_type}</p>
          </div>

          <div className="detail-group">
            <label>Harvest Date</label>
            <p>{new Date(data.harvest_date).toLocaleDateString()}</p>
          </div>

          <div className="detail-group">
            <label>Batch Number</label>
            <p className="monospace">{data.batch_number}</p>
          </div>

          <div className="detail-group">
            <label>Quality Grade</label>
            <p className="grade">{data.quality_grade || "N/A"}</p>
          </div>
        </div>
        
        <div className="traceability-footer">
          <p>Scanned via Skynet Traceability System</p>
        </div>
      </div>
    </div>
  );
}
