import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { handleDispatch } from "./index.ts";

Deno.test("Dispatch Pilot - Returns 400 if payload is missing record", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ type: 'INSERT', table: 'bookings' }),
  });
  
  const res = await handleDispatch(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Invalid payload structure");
});

Deno.test("Dispatch Pilot - Returns 400 if plot_id is missing", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ 
      type: 'INSERT', 
      table: 'bookings',
      record: { id: "123" }
    }),
  });
  
  const res = await handleDispatch(req);
  assertEquals(res.status, 400);
});

Deno.test("Dispatch Pilot - Ignores if pilot_id is already assigned", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ 
      type: 'INSERT', 
      table: 'bookings',
      record: { id: "123", plot_id: "plot-123", pilot_id: "pilot-1" }
    }),
  });
  
  const res = await handleDispatch(req);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.message, "Webhook ignored");
});

Deno.test("Dispatch Pilot - Fails 500 if missing env vars for unassigned pilot", async () => {
  // Clear env vars to trigger the error locally
  const originalUrl = Deno.env.get("SUPABASE_URL");
  if (originalUrl) Deno.env.delete("SUPABASE_URL");

  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ 
      type: 'INSERT', 
      table: 'bookings',
      record: { id: "123", plot_id: "plot-123", pilot_id: null }
    }),
  });
  
  const res = await handleDispatch(req);
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.error, "Missing Supabase environment variables");
});
