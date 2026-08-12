# Deferred Work

## Deferred from: code review of 2-1-hazard-annotation-and-photo-upload (2026-06-13)

- **State cleared on upload error — no retry path for user** [`HazardAnnotationOverlay.tsx:62`]: The `finally` block in `submitHazard` always clears `activeLocation` and `photoUri`, meaning a failed upload forces the user to re-long-press and re-capture the photo. A proper retry flow should preserve state on failure.
- **`can_access_plot()` may interact with existing `is_plot_owner_or_manager()` security definer fn** [`0003_create_hazard_pins.sql:5-14`]: The new `can_access_plot()` helper duplicates logic from the existing `is_plot_owner_or_manager()` security definer function introduced in migration `0002`. Should be consolidated into a single RLS helper to avoid drift. Verify no circular recursion edge case exists when both functions are in scope.

## Deferred from: code review of 2-2-offline-pin-queue-and-background-sync (2026-06-13)

- **Silent photo data loss during offline pin drop** [`apps/mobile/src/features/telemetry/api/useCreateHazardPin.ts:40`]: When offline, the photo URI is discarded completely. The local URI should ideally be copied to the document directory and stored in the queue so it can be uploaded when back online, or the UI should explicitly warn the user. Deferred because the story spec explicitly scoped photos to online-only for this iteration.
- **Manual queue replay instead of TanStack Query persist** [`apps/mobile/src/store/useSyncHazardPins.ts`]: AC2 specified that TanStack Query automatically replays the queued mutations, but the implementation uses a custom `drainQueue` hook calling Supabase directly. Deferred as an architectural simplification since the current approach works and respects the AsyncStorage requirement.

## Deferred from: code review of 2-3-mission-safety-check-out-rule (2026-06-14)

- **`useCheckoutFlight` uses `throw` in mutation** [`useCheckoutFlight.ts:27`]: Inconsistent with the stated architecture rule "never throw" — however, TanStack Query mutation functions use `throw` by convention; the rule targets direct Supabase calls outside TQ. Low risk.
- **Silent no-op when `hazardPins` undefined at button-press time** [`FlightCheckout.tsx:72`]: During a TanStack background refetch, `hazardPins` could briefly be undefined. The early return fires with no user feedback. Acceptable UX edge case in the current MVP.
- **All plot cards share a single `mockBookingId`** [`page.tsx:68`]: Dev scaffolding only. A pilot viewing plot 2 checks out against a booking belonging to plot 1. Will be replaced by proper booking selection in Epic 3.
- **Checkout signature is timestamp-only, no pin-ID hash** [`useCheckoutFlight.ts:19`]: Spec said "ideally, generate a simple hash of the `hazard_pin_ids`". Timestamp satisfies the stated minimum. Hash should be added before production launch for auditability.

## Deferred from: code review of 2-3-mission-safety-check-out-rule CR Pass 2 (2026-06-14)

- **`set_updated_at()` function name collision risk across migrations** [`0004_create_bookings.sql:49-55`]: `CREATE OR REPLACE FUNCTION public.set_updated_at()` will silently overwrite any same-named function from prior migrations. Currently safe because the body is identical across tables, but diverging signatures in a future migration could corrupt earlier triggers. Consolidate into a single shared migration utility before Epic 3.

## Deferred from: code review of 1-4-proactive-map-caching-offline-mode CR Pass 2 (2026-06-14)

- **SecureStore 2 KB iOS keychain size ceiling** [`apps/mobile/src/lib/cache.ts:8`]: `SecureStore.setItemAsync` has a ~2 KB value limit on some iOS keychain backends. Storing many large `FarmPlot` records with GeoJSON polygon coordinates as a single serialised blob can silently fail (error is swallowed). No size guard or chunking strategy. Mitigation: switch to `AsyncStorage` for large payloads or chunk the data across multiple keys. Acceptable for current MVP scope.
- **No web cache unit tests** [`apps/web/src/lib/cache.ts`]: The `saveFarmPlots` and `getCachedFarmPlots` functions on web (localStorage-backed) are entirely untested. Web unit test infrastructure (Vitest) is not configured in this sprint. Should be established as part of a web test setup story before Epic 3 hardening.

## Deferred from: code review of 2-4-emergency-unsynced-telephony-fallback (2026-06-14)

- **`useFetchActiveBooking` uses `throw` instead of `{data, error}` pattern** [`useFetchActiveBooking.ts:16`]: Same throw-on-error pattern used in `useFetchHazardPins.ts`; TanStack Query wraps and surfaces the thrown error correctly. Consistent with existing codebase convention.
- **`handleExistingPinPress` typed as `any`** [`HazardAnnotationOverlay.tsx:173`]: MapLibre RN event type is `any` across existing components in this codebase. Should be addressed when MapLibre types improve.
- **No component test for Unsynced detection logic** [`HazardAnnotationOverlay.tsx`]: The Unsynced hazard detection branch (`checkoutTime !== null && pinTime > checkoutTime`) has no isolated unit test. Should be added in a future testing hardening pass.
- **`pendingGeoJSON` not memoized** [`HazardAnnotationOverlay.tsx:125`]: Minor perf issue — reconstructed every render. Not introduced by this story. Add `useMemo` in a future cleanup pass.
- **`useFetchActiveBooking` uses `select('*')`** [`useFetchActiveBooking.ts:10`]: Over-fetches all booking columns when only `id`, `checkout_time`, and `pilot_id` are needed. Acceptable for MVP; narrow in future housekeeping.

## Deferred from: code review of 5-1-external-wms-layer-toggling (2026-06-19)

- **Security: Exposed Sentinel Hub Instance ID**: mobile apps often bundle these keys until proxy infrastructure is built.
- **Hazards Rendered Off-Screen**: static initial center is expected behavior for now.
- **Overlapping Hazard Pins Mask Acknowledgment**: edge case where pins are at the exact same coordinate.

## Deferred from: code review of 5-1-external-wms-layer-toggling CR Pass 2 (2026-06-20)

- **No accessibility labels on FAB or menu items** [`LayerToggleFAB.tsx`]: `TouchableOpacity` elements lack `accessibilityLabel` and `accessibilityRole`. Pre-existing UX gap across all components.
- **Menu doesn't close on outside tap** [`LayerToggleFAB.tsx`]: Standard FAB behavior improvement for a future UX pass.
- **Pin-processing business logic lives in component not utility** [`FlightCheckout.tsx`]: Minor deviation from spec's "keep heavy logic out" constraint; acceptable for MVP complexity.

## Deferred from: code review of 5-2-scheduled-ndvi-ingestion-pipeline (2026-06-20)

- **No index on `plot_risk_scores` for downstream queries** [`0012_create_geoai_tables.sql`]: Stories 5.3 (AI Crop Stress Risk Engine) and 5.4 (Push Notifications) will query `plot_risk_scores` by `plot_id` and filter by `expires_at`. No covering index exists. Add `CREATE INDEX idx_risk_scores_plot_expires ON plot_risk_scores(plot_id, expires_at)` when implementing Story 5.3.

## Deferred from: full codebase adversarial code review (2026-06-20)

- **Missing webhook secret verification in Edge Functions** [`supabase/config.toml:2323,2334`]: Both `flight-path-optimizer` and `dispatch-pilot` disable JWT verification (`verify_jwt = false`) to allow Supabase Database Webhooks to invoke them. Currently, they perform no custom `WEBHOOK_SECRET` header validation, meaning they are technically public on the internet. Should implement secret validation for defense-in-depth before production.

## Deferred from: code review of 5-2-scheduled-ndvi-ingestion-pipeline and 5.3 (2026-06-20)

- **Data Leak via Security Definer Function** [`supabase/migrations/0014_crop_types_and_thresholds.sql`]: `get_active_plots_bboxes` exposes all plots across tenants, deferred as architectural RLS bypass required for background cron jobs.
- **Unauthenticated Edge Function Endpoint** [`supabase/functions/crop-stress-predictor/index.ts`]: The edge function completely lacks validation of the `Authorization` header, allowing unauthenticated public requests. Deferred as this is a pre-existing technical debt logged in deferred-work.md.
- **Edge Function Execution Timeout & Rate Limiting** [`supabase/functions/crop-stress-predictor/index.ts`]: Sequential API calls for all plots cause timeouts and HTTP 429s. Deferred as architectural queuing requirement beyond current scope.
- **Missing File Structure Separation** [`supabase/functions/crop-stress-predictor/index.ts`]: Dumped all Sentinel Hub API logic and risk analysis into a single file. Deferred, single file is manageable for now.
