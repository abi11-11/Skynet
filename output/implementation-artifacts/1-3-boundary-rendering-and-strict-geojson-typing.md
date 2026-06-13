---
story_id: 1.3
story_key: 1-3-boundary-rendering-and-strict-geojson-typing
epic_id: 1
status: done
baseline_commit: none
---

# Story 1.3: Boundary Rendering and Strict GeoJSON Typing

## 📖 Story Requirements

**User Story:**
As an Estate Owner,
I want boundary geometry to be modeled as strict GeoJSON,
So that my plots can be rendered and validated consistently across web and mobile.

**Acceptance Criteria:**
- **Given** farm plot geometry is stored in PostGIS
- **When** the client loads assigned plots
- **Then** the application uses strict GeoJSON polygon typings
- **And** plot cards display boundary metadata instead of raw geometry blobs

## 🧠 Implementation Scope

This story adds strict GeoJSON boundary typing to the shared type package and surfaces polygon metadata in the web and mobile UIs.
It does not require a full map library, but it does enforce a better boundary contract for future rendering.

### Implementation Tasks
- [x] Add strict GeoJSON polygon types to `packages/types/index.ts`
- [x] Normalize Supabase `farm_plots.area` values in web and mobile query helpers
- [x] Surface plot boundary metadata in `apps/web` and `apps/mobile`
- [x] Add a lightweight map rendering stub for plot boundaries

## 📁 File List
- `packages/types/index.ts`
- `apps/web/src/lib/farmPlots.ts`
- `apps/web/src/App.tsx`
- `apps/mobile/src/lib/farmPlots.ts`
- `apps/mobile/app/page.tsx`

## 🔧 Notes
- `area` is now typed as `GeoJSONPolygon | string | null` to preserve compatibility with raw database payloads while enforcing strict polygon shape when supported.
- The apps display boundary type and vertex count as the first step toward geo boundary rendering.
- Full map visualization can be added later once a mapping library is introduced.

## ✅ Verification Status
- Web build verified and remains intact after GeoJSON typing and boundary map stub updates.
- Mobile TypeScript compile check passed after the shared type, helper, and boundary stub changes.
