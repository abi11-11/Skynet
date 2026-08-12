import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Webhook payload from pg_net
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    plot_id: string;
    pilot_id: string | null;
    status: string;
  };
  old_record?: any;
}

export const handleDispatch = async (req: Request): Promise<Response> => {
  try {
    const payload: WebhookPayload = await req.json();

    if (!payload?.record || !payload.record.id || !payload.record.plot_id) {
      console.error("Invalid webhook payload: missing record or required fields.");
      return new Response(JSON.stringify({ error: "Invalid payload structure" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Received webhook payload for booking: ${payload.record.id}`);

    // Only process inserts where pilot_id is not yet assigned
    if (payload.type === 'INSERT' && payload.table === 'bookings' && !payload.record.pilot_id) {
      const booking = payload.record;

      // Initialize Supabase client with Service Role key to bypass RLS
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase environment variables");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Call the PostGIS stored procedure to find the nearest pilot
      const { data: pilotId, error: rpcError } = await supabase
        .rpc('get_nearest_available_pilot', {
          p_plot_id: booking.plot_id
        });

      if (rpcError) {
        console.error("Error executing spatial search:", rpcError);
        throw rpcError;
      }

      if (pilotId) {
        console.log(`Assigning booking ${booking.id} to pilot ${pilotId}`);

        // Update the booking with the selected pilot
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ pilot_id: pilotId })
          .eq('id', booking.id);

        if (updateError) {
          console.error("Failed to update booking with pilot ID:", updateError);
          throw updateError;
        }

        // Mock: Fetch pilot's expo push token from a theoretical 'user_devices' or 'profiles' table
        // For this mock, we assume we retrieved it:
        const mockPushToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
        
        // Send a push notification via Expo Push API
        console.log(`Sending real-time push notification to Pilot ${pilotId}...`);
        
        const pushMessage = {
          to: mockPushToken,
          sound: 'default',
          title: 'New Job Assigned!',
          body: 'You have been dispatched to a new farm plot within your radius.',
          data: { bookingId: booking.id, plotId: booking.plot_id },
        };

        // In a real scenario, you'd execute this fetch:
        /*
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pushMessage),
        });
        */
       
        console.log("Notification payload built successfully:", pushMessage);

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Booking assigned to pilot ${pilotId}` 
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        console.log(`No active pilots found within 50km for plot ${booking.plot_id}. Booking remains unassigned.`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "No active pilots found nearby. Booking left unassigned." 
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook ignored" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in dispatch-pilot Edge Function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Only serve if this file is the main entry point (not imported in tests)
if (import.meta.main) {
  serve(handleDispatch);
}
