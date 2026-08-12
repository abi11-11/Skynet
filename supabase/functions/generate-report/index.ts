import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload.type !== "UPDATE" || payload.table !== "bookings") {
      return new Response("Ignored", { status: 200 });
    }

    const booking = payload.record;
    if (booking.status !== "Completed") {
      return new Response("Ignored", { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch total exact count
    const { count } = await supabase
      .from('flight_telemetry')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', booking.id);

    const pointCount = count || 0;

    // Fetch first point (Start Time)
    const { data: firstPoint } = await supabase
      .from('flight_telemetry')
      .select('timestamp')
      .eq('booking_id', booking.id)
      .order('timestamp', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Fetch last point (End Time)
    const { data: lastPoint } = await supabase
      .from('flight_telemetry')
      .select('timestamp')
      .eq('booking_id', booking.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    const startTime = firstPoint?.timestamp || 'N/A';
    const endTime = lastPoint?.timestamp || 'N/A';

    const { data: plot } = await supabase
      .from('farm_plots')
      .select('name')
      .eq('id', booking.plot_id)
      .single();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(`Skynet Flight Report`, { x: 50, y: 800, size: 24, font, color: rgb(0, 0.5, 0) });
    page.drawText(`Booking ID: ${booking.id}`, { x: 50, y: 760, size: 12, font });
    page.drawText(`Plot Name: ${plot?.name || 'Unknown'}`, { x: 50, y: 740, size: 12, font });
    page.drawText(`Status: ${booking.status}`, { x: 50, y: 720, size: 12, font });
    
    page.drawText(`Flight Statistics:`, { x: 50, y: 680, size: 16, font });
    page.drawText(`Telemetry Points Logged: ${pointCount}`, { x: 50, y: 650, size: 12, font });
    page.drawText(`Start Time: ${startTime}`, { x: 50, y: 630, size: 12, font });
    page.drawText(`End Time: ${endTime}`, { x: 50, y: 610, size: 12, font });

    page.drawText(`Evidence Links:`, { x: 50, y: 570, size: 16, font });
    page.drawText(`Pre-Flight Photo: ${booking.pre_flight_photo_url || 'N/A'}`, { x: 50, y: 540, size: 10, font, color: rgb(0, 0, 1) });
    page.drawText(`Post-Flight Photo: ${booking.post_flight_photo_url || 'N/A'}`, { x: 50, y: 520, size: 10, font, color: rgb(0, 0, 1) });

    const pdfBytes = await pdfDoc.save();

    const fileName = `${booking.id}/report_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    const reportUrl = publicUrlData.publicUrl;

    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'reports@skynet-drones.com',
          to: 'farm.manager@example.com',
          subject: `Flight Report for Plot: ${plot?.name}`,
          html: `<p>Your automated flight report is ready.</p><p><a href="${reportUrl}">Download PDF Report</a></p>`
        })
      });
    } else {
      console.log(`Mock Email sent to Farm Manager. Report URL: ${reportUrl}`);
    }

    return new Response(JSON.stringify({ success: true, url: reportUrl }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
