import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SCL cloud/shadow classes: 1=Saturated, 3=Shadow, 8=Cloud Medium, 9=Cloud High, 10=Cirrus
const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { id: "ndvi", bands: 1, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  const isCloudy = [1, 3, 8, 9, 10].includes(sample.SCL);
  const denom = sample.B08 + sample.B04;
  const ndvi = denom === 0 ? 0 : (sample.B08 - sample.B04) / denom;
  return {
    data: [ndvi],
    dataMask: [isCloudy ? 0 : sample.dataMask]
  };
}`;

const CROP_THRESHOLDS: Record<string, { high: number; critical: number }> = {
  wheat: { high: 0.10, critical: 0.20 },
  corn: { high: 0.10, critical: 0.20 },
  soy: { high: 0.15, critical: 0.25 },
  rice: { high: 0.10, critical: 0.15 },
  unknown: { high: 0.15, critical: 0.25 },
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting crop-stress-predictor...');

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Connect to Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey
    );

    // 1. Fetch OAuth2 token for Sentinel Hub Statistical API
    const clientId = Deno.env.get('SENTINEL_CLIENT_ID');
    const clientSecret = Deno.env.get('SENTINEL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Missing Sentinel Hub credentials in Edge Function Secrets');
    }

    const tokenRes = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Failed to fetch Sentinel token: ${tokenRes.statusText}`);
    }

    const { access_token } = await tokenRes.json();
    console.log('Successfully acquired Sentinel Hub token.');

    // 2. Fetch all active farm_plots with their PostGIS boundary geometry
    // We use a custom RPC to efficiently fetch the bounding box as GeoJSON
    const { data: plots, error: plotsError } = await supabaseClient.rpc('get_active_plots_bboxes');

    if (plotsError) {
      throw new Error(`Failed to fetch plots: ${plotsError.message}`);
    }

    if (!plots || plots.length === 0) {
      console.log('No active plots found. Exiting.');
      return new Response(JSON.stringify({ message: 'No active plots found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing ${plots.length} plots...`);

    // Time ranges: from 24h ago to now
    const now = new Date();
    // Expand window to 3 days to account for Sentinel-2 L2A processing delays
    const fromTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const toTime = now.toISOString();
    const captureTime = now.toISOString();

    let processedCount = 0;
    let skippedCount = 0;

    for (const plot of plots) {
      console.log(`Processing plot ${plot.id}...`);

      try {
        // 3. Call Sentinel Hub Statistical API
        const statsPayload = {
          input: {
            bounds: {
              geometry: plot.bbox_geojson,
              properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
            },
            data: [{
              type: "sentinel-2-l2a",
              dataFilter: {
                timeRange: { from: fromTime, to: toTime },
                maxCloudCoverage: 80
              }
            }]
          },
          aggregation: {
            timeRange: { from: fromTime, to: toTime },
            aggregationInterval: { of: "P1D" },
            evalscript: EVALSCRIPT,
            resx: 10,
            resy: 10
          }
        };

        const statsRes = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(statsPayload)
        });

        if (!statsRes.ok) {
          console.warn(`[API Warning] Plot ${plot.id} request failed: ${statsRes.statusText}`);
          skippedCount++;
          continue;
        }

        const statsData = await statsRes.json();
        const outputs = statsData.data?.[0]?.outputs?.ndvi?.bands?.B0;

        // 4. Handle cloud-obscured plots gracefully
        if (!outputs || !outputs.stats) {
          console.warn(`Skipping plot ${plot.id}: no statistics returned from Sentinel Hub.`);
          skippedCount++;
          continue;
        }

        const stats = outputs.stats;
        // Check if all pixels were masked (sampleCount === 0)
        // or noDataCount > 80%
        const isCloudy = stats.sampleCount === 0 || (stats.noDataCount / (stats.sampleCount + stats.noDataCount) > 0.8);

        if (isCloudy) {
          console.warn(`Skipping plot ${plot.id}: insufficient clear pixels (cloud coverage too high)`);
          skippedCount++;
          continue;
        }

        const ndviValue = stats.mean;

        // 5. Insert valid results into plot_ndvi_snapshots
        const { error: insertError } = await supabaseClient
          .from('plot_ndvi_snapshots')
          .insert({
            plot_id: plot.id,
            ndvi_value: ndviValue,
            source: 'sentinel',
            captured_at: captureTime
          });

        // Ignore unique constraint violations (upsert/idempotency guard)
        if (insertError) {
          if (insertError.message.includes('unique constraint')) {
            console.log(`Snapshot already exists for plot ${plot.id} today. Skipping risk calculation.`);
            skippedCount++;
            continue;
          } else {
            throw new Error(`Failed to insert NDVI snapshot: ${insertError.message}`);
          }
        }

        // 6. Compute 14-day rolling average and write risk scores
        const { data: recentSnapshots, error: snapError } = await supabaseClient
          .from('plot_ndvi_snapshots')
          .select('ndvi_value')
          .eq('plot_id', plot.id)
          .lt('captured_at', captureTime)
          .gte('captured_at', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString());

        if (snapError) {
          throw new Error(`Failed to fetch recent snapshots: ${snapError.message}`);
        }

        // Simple risk calculation using crop-specific thresholds
        if (recentSnapshots && recentSnapshots.length >= 3) {
          const sum = recentSnapshots.reduce((acc: number, val: any) => acc + Number(val.ndvi_value), 0);
          const rollingAvg = sum / recentSnapshots.length;

          if (rollingAvg <= 0) {
            console.warn(`Plot ${plot.id} has non-positive rolling average (${rollingAvg}). Skipping risk ratio calc.`);
            processedCount++;
            continue;
          }

          const dropRatio = (rollingAvg - ndviValue) / rollingAvg;
          const thresholds = CROP_THRESHOLDS[plot.crop_type?.toLowerCase()] || CROP_THRESHOLDS.unknown;

          let riskLevel: 'high' | 'critical' | null = null;
          
          if (dropRatio >= thresholds.critical) {
            riskLevel = 'critical';
          } else if (dropRatio >= thresholds.high) {
            riskLevel = 'high';
          }

          if (riskLevel) {
            const { error: riskError } = await supabaseClient
              .from('plot_risk_scores')
              .insert({
                plot_id: plot.id,
                risk_level: riskLevel,
                recommended_service: 'precision-spray',
                confidence: 0.85,
                expires_at: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString()
              });

            if (riskError) {
              console.error(`Failed to insert risk score for plot ${plot.id}: ${riskError.message}`);
            }
          }
        }

        processedCount++;
      } catch (err) {
        console.error(`Error processing plot ${plot.id}:`, err);
        skippedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount, 
      skipped: skippedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('crop-stress-predictor error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
