import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record; // the plot_risk_scores row

    if (!record || record.risk_level !== 'critical') {
      return new Response(JSON.stringify({ success: true, message: "Not a critical risk, ignoring." }), { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get the plot details to find the manager/owner
    const { data: plot, error: plotError } = await supabaseClient
      .from('farm_plots')
      .select('name, owner_id, manager_id')
      .eq('id', record.plot_id)
      .single();

    if (plotError || !plot) {
      throw new Error(`Failed to fetch plot details: ${plotError?.message}`);
    }

    // Find push tokens for manager or owner
    const targetUserIds = [plot.manager_id, plot.owner_id].filter(Boolean);

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No target users for plot." }), { headers: corsHeaders });
    }

    const { data: pushTokens, error: tokenError } = await supabaseClient
      .from('user_push_tokens')
      .select('expo_push_token')
      .in('user_id', targetUserIds);

    if (tokenError) {
      throw new Error(`Failed to fetch push tokens: ${tokenError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No push tokens found for users." }), { headers: corsHeaders });
    }

    const expoTokens = pushTokens.map(pt => pt.expo_push_token);

    // Send push notification to Expo
    const expoPayload = {
      to: expoTokens,
      sound: 'default',
      title: '⚠️ Critical Crop Stress Detected',
      body: `Your plot "${plot.name}" has shown a critical drop in NDVI. Immediate action is recommended. Tap to book precision spray.`,
      data: { url: `skynet://booking?plotId=${record.plot_id}` },
    };

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expoPayload),
    });

    const expoData = await expoRes.json();

    return new Response(JSON.stringify({ success: true, expoResponse: expoData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error sending push notification:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
