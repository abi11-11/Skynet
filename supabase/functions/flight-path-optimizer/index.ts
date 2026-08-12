import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generateFlightPath } from './flightPathGenerator.ts'

console.log('Flight Path Optimizer Edge Function started.')

serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const booking = payload.record

    // Only process if we have a booking and plot ID
    if (!booking || !booking.id || !booking.plot_id) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Plot Boundary
    const { data: plotData, error: plotError } = await supabaseClient
      .from('farm_plots')
      .select('boundary')
      .eq('id', booking.plot_id)
      .single()

    if (plotError || !plotData || !plotData.boundary) {
      throw new Error('Failed to fetch plot boundary')
    }

    // 2. Fetch Hazard Pins for this plot
    const { data: hazards, error: hazardsError } = await supabaseClient
      .from('hazard_pins')
      .select('location')
      .eq('plot_id', booking.plot_id)

    if (hazardsError) {
      throw new Error(`Failed to fetch hazards: ${hazardsError.message}`)
    }

    // 3. Generate safe flight path, accounting for 10m exclusion zones
    // deno-lint-ignore no-explicit-any
    const plotGeoJSON = plotData.boundary as any
    // deno-lint-ignore no-explicit-any
    const hazardsGeoJSON = (hazards || []).map((h: any) => h.location)

    const result = generateFlightPath(plotGeoJSON, hazardsGeoJSON)

    if ('error' in result) {
      console.log(`Booking ${booking.id} is unflyable: ${result.error}`)
      await supabaseClient
        .from('bookings')
        .update({ status: 'unflyable', waypoint_status: 'pending_pilot_review' })
        .eq('id', booking.id)
      
      return new Response(JSON.stringify({ message: result.error }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const flightPath = result

    // 6. Save back to database
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        flight_waypoints: flightPath.geometry,
        waypoint_status: 'pending_pilot_review'
      })
      .eq('id', booking.id)

    if (updateError) {
      throw updateError
    }

    console.log(`Successfully generated flight path for booking ${booking.id}`)
    return new Response(JSON.stringify({ message: 'Flight path optimized successfully' }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Optimizer Error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
