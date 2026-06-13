---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - output/planning-artifacts/prd/skynet-drone-services/prd.md
  - output/planning-artifacts/research/market-drone-services-tamil-nadu-agriculture-research-2026-05-20.md
  - output/project-context.md
  - docs/validation-report-2026-05-26.md
workflowType: 'architecture'
project_name: 'skynet'
user_name: 'terminator'
date: '2026-06-01'
lastStep: 8
status: 'complete'
completedAt: '2026-06-04'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- **Geospatial & Hierarchy:** Boundary ingestion (KML, API, AI Snap), parent/child tenant views, and rich map layer toggling (NDVI, Weather, etc.).
- **Booking & Dispatch:** Contextual recommendations, algorithmic pilot routing, exact chemical/cost calculators, and telephony fallback.
- **Proof-of-Service:** Live GPS tracking, automated coverage map generation, geo-tagged photo evidence, and UPI/GST payment workflows.

**Non-Functional Requirements:**
- **Offline-First Execution:** Proactive caching of map tiles and queuing of booking requests to survive zero-connectivity environments.
- **Performance:** Smooth rendering of complex, multi-layered map data on field devices.
- **Reliability:** Bulletproof pilot dispatching and telemetry tracking to prevent overlapping or missed areas.

**Scale & Complexity:**
The platform blends logistics, fintech, and advanced GIS capabilities into a field-ready package.

- Primary domain: Mobile Apps (Farmer & Pilot) + Geospatial Backend Services
- Complexity level: High
- Estimated architectural components: 5-7 (Core API, Spatial Engine, Sync/Offline Resolver, Routing/Dispatch Service, Mobile Clients)

### Decomposed System Architecture
To manage complexity and isolate failure domains, the system is decomposed into five distinct layers:
1. **Field Node (Mobile Client):** Cross-platform app with local SQLite storage for offline-first CRDT sync, local event queuing, and an OS-level background sync manager to silently pre-fetch map tiles over Wi-Fi, ensuring the app is field-ready without blocking the user interface.
2. **Control Plane (Core API):** Stateless gateway managing Auth, Tenant RBAC, and standard business logic.
3. **Spatial Engine:** CPU-optimized service dedicated to PostGIS queries, pilot routing, and map layer processing (NDVI/Weather).
4. **Telemetry Stream:** High-throughput, write-optimized pipeline strictly for immutable drone GPS tracks and coverage proof.
5. **The Ledger:** Isolated fintech microservice handling UPI integrations and GST invoicing, triggered asynchronously by completed telemetry events.

### Technical Constraints & Dependencies

- Mobile mapping library must support robust offline tile caching and custom polygon rendering with hardware acceleration.
- Backend must handle spatial queries efficiently (e.g., PostGIS) for clustering and routing.
- Integration with external services: Government Land Registry APIs, UPI Payment Gateways, Weather/NDVI data providers, and Telephony/IVR services.
- **ML Constraint:** AI Boundary snapping (FR-1.1) must either be strictly online-only or utilize a highly optimized, lightweight on-device ML model to satisfy the offline-first mandate without draining battery.

### Cross-Cutting Concerns Identified

- **Data Synchronization & Storage:** Seamless transition between local-first storage and remote cloud state via eventual consistency.
- **Tenant Hierarchy (RBAC) & Aggregation:** Strict isolation between Estate Owners and Managers, necessitating materialized views or caching layers to compute complex estate-wide aggregates (like NDVI scores) without choking the backend.
- **Audit, Telemetry & Evidence:** Traceability of GPS flight tracks, payments, and media uploads. This will require heavy simulation and mocking tools to test telemetry edge cases (dropped packets, dead zones) prior to deployment.

### Architectural Directives
- **Offline Sync Strategy (Hybrid Model):** 
  - **Relational Data (Boundaries, Tenants, Bookings):** Implemented via State-Based Sync with CRDTs (e.g., SQLite + PowerSync/ElectricSQL) to maximize frontend reactivity and handle automatic conflict resolution.
  - **Telemetry & Proof-of-Service (GPS, Photos, Billing):** Implemented via an Append-Only Event Log. Clients will queue these events locally and stream them to a backend time-series database (e.g., TimescaleDB) upon reconnection to guarantee a tamper-proof audit trail for DGCA compliance.
- **Spatial Engine & Map Rendering:**
  - **Mobile Rendering:** MapLibre Native will be used for hardware-accelerated, smooth toggling between complex map layers on the Field Node.
  - **Offline Map Strategy (Predictive Tile Baking):** The Spatial Engine will run a nightly predictive baking job to pre-compute NDVI/Heatmap raster tiles for active estates and cache them on a CDN. When a user syncs for offline mode, the client downloads the pre-computed raster MBTiles alongside lightweight, dynamic vector boundary data, preventing CPU bottlenecks during peak morning syncs.

## Starter Template Evaluation

### Primary Technology Domain

Mobile Application (Field Node) and Single Page Web App (Dashboard) based on project requirements analysis

### Starter Options Considered

- **React Native (Expo)**: Evaluated for the mobile client. Provides excellent DX, over-the-air updates, and deep native module support required for offline databases and MapLibre integrations.
- **Vite (React + TypeScript)**: Evaluated for the web dashboard. Fast HMR and build times, perfect for authenticated dashboards and heavy 3D rendering.
- **Supabase (Backend-as-a-Service)**: Evaluated for the backend. Provides managed PostgreSQL with native logical replication, essential for CRDT offline sync, while eliminating DevOps overhead.

### Selected Starter: Expo (Mobile), Vite (Web), & Supabase (Backend)

**Rationale for Selection:**
For a solo-developer team, speed to market and reduced DevOps complexity are paramount. Expo provides a robust cross-platform mobile foundation. Vite provides the standard React web foundation. Supabase was explicitly chosen to mitigate the highest technical hurdle: Offline CRDT Synchronization. It provides managed Postgres and PostGIS, completely eliminating the need for a custom "Geospatial Map Engine" microservice. Heavy asynchronous photogrammetry jobs will be outsourced to third-party APIs (like WebODM Lightning) in Tier 1.

**Initialization Commands:**

```bash
# Mobile App (Field Node)
npx create-expo-app@latest skynet-mobile --template default@sdk-56

# Web Dashboard
npm create vite@latest skynet-web -- --template react-ts

# Backend Database/Auth
npx supabase init
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript (Strict Mode) running on Metro (Mobile) and esbuild (Web). Backend logic via Supabase Edge Functions (Deno/TS).

**Styling Solution:**
React Native StyleSheet for Mobile. Vanilla CSS / CSS Modules for Web.

**Build Tooling:**
Expo CLI for Mobile. Vite (Rollup) for Web.

**Testing Framework:**
Jest setup included natively in Expo. Vitest recommended for the Vite project.

**Code Organization:**
Standard React component structures.

**Development Experience:**
Fast Refresh (Mobile) and HMR (Web) configured out of the box with strict TypeScript linting. Local Supabase CLI for database migrations and testing.

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Offline Sync Engine: Decided (TanStack Query + AsyncStorage event queue, dropping PowerSync/CRDTs)
- Primary Database & Auth: Decided (Supabase)

**Important Decisions (Shape Architecture):**
- Frontend State Management: Decided (TanStack Query)
- Mobile & Web Infrastructure: Decided (Expo EAS + Vercel)

**Deferred Decisions (Post-MVP):**
- Advanced 3D Mesh rendering libraries (CesiumJS) deferred to Tier 2.

### Data Architecture

- **Database:** Supabase (PostgreSQL 15+). Chosen for managed PostGIS spatial capabilities and built-in auth.
- **Offline Sync Strategy:** Append-Only Event Queue. We explicitly rejected heavy CRDT engines (PowerSync) in favor of a simpler TanStack Query + AsyncStorage offline queue, relying on strict UX rules (Check-Out/Check-In) to prevent field conflicts.

### Authentication & Security

- **Authentication:** Supabase Auth with Row Level Security (RLS). Ensures that tenant data is isolated strictly at the database level.
- **Role-Based Access Control:** Managed via Supabase JWT claims (Pilot vs. Farm Manager).

### API & Communication Patterns

- **API Pattern:** Supabase client SDK (PostgREST) for CRUD. Supabase Edge Functions (Deno) for custom serverless logic (e.g., triggering webhooks to WebODM).
- **External Integrations:** WebODM Lightning API for photogrammetry processing in Tier 1.

### Frontend Architecture

- **State Management:** TanStack Query (React Query v5) for server state and offline caching. Zustand for pure local UI state (if needed).
- **Map Rendering:** MapLibre Native (Mobile) and Mapbox GL JS (Web) to handle heavy vector tiles and WMS satellite layers.

### Infrastructure & Deployment

- **Mobile CI/CD:** Expo EAS (Enterprise App Services) for cloud builds and OTA updates.
- **Web Dashboard CI/CD:** Vercel (or Netlify) for zero-config Vite deployments.

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize Supabase, Expo, and Vite projects.
2. Configure Supabase Auth and basic RLS policies.
3. Setup TanStack Query and the basic AsyncStorage offline queue.
4. Integrate MapLibre Native and verify offline Mapbox packs.
5. Implement the "Check-Out" syncing logic for Pilots.

**Cross-Component Dependencies:**
The entire offline architecture hinges on TanStack Query effectively queueing mutations when offline and syncing them seamlessly upon reconnection to Supabase.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
5 areas where AI agents could make different choices (Naming, Structure, Formatting, Communication, Process).

### Naming Patterns

**Database Naming Conventions (Supabase):**
- Tables: `snake_case`, plural (e.g., `farm_plots`, `hazard_pins`)
- Columns: `snake_case`, singular (e.g., `plot_id`, `created_at`)
- Foreign Keys: `{table_singular}_id` (e.g., `plot_id`)

**Code Naming Conventions (Expo/React):**
- React Components: `PascalCase` (e.g., `HazardPin.tsx`)
- Hooks: `camelCase` starting with 'use' (e.g., `useSyncQueue.ts`)
- Utility functions: `camelCase` (e.g., `formatGpsCoordinates.ts`)
- Constants/Env: `UPPER_SNAKE_CASE` (e.g., `EXPO_PUBLIC_SUPABASE_URL`)

### Structure Patterns

**Project Organization:**
- `/src/components`: Reusable UI elements (dumb components)
- `/src/features`: Domain-specific modules (e.g., `/features/map`, `/features/auth`) containing their own hooks/api calls.
- `/src/lib`: Third-party wrappers (e.g., `supabase.ts`, `queryClient.ts`)

### Format Patterns

**Data Exchange Formats:**
- All timestamps must be stored and transmitted in UTC `ISO-8601` strings.
- Map coordinates must **always** follow `[longitude, latitude]` format (GeoJSON standard).

### Communication Patterns

**State Management Patterns:**
- TanStack Query Keys: Must be strictly typed arrays (e.g., `['hazard_pins', 'list', plotId]`).
- Async Storage Queue Keys: Prefixed with `offline_queue:` (e.g., `offline_queue:hazard_pins`).

### Process Patterns

**Error Handling Patterns:**
- All Supabase API calls must handle the standard `{ data, error }` tuple.
- Do NOT `throw` errors for expected API failures; handle the `error` object gracefully and trigger a global UI toast notification.

### Enforcement Guidelines

**All AI Agents MUST:**
- Adhere strictly to the `[longitude, latitude]` coordinate order for all MapLibre and PostGIS interactions.
- Always check the `error` object returned from Supabase before assuming `data` is present.
- Never write direct SQL via REST endpoints; use standard Supabase JS client builder methods.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
skynet-monorepo/
├── package.json               # Root workspace configuration (NPM Workspaces)
├── README.md
├── .gitignore
├── supabase/                  # Backend Infrastructure
│   ├── config.toml            # Local Supabase configuration
│   ├── migrations/            # SQL schemas (tables, RLS policies, PostGIS)
│   ├── functions/             # Deno Edge functions (WebODM webhook triggers)
│   └── seed.sql               # Mock data for local testing
├── packages/                  # Shared code between apps
│   ├── types/                 # Auto-generated Supabase TS types (`supabase gen types typescript`)
│   └── utils/                 # Shared formatting/validation logic
├── apps/
│   ├── mobile/                # Expo React Native App (Field Node)
│   │   ├── app.json           # Expo EAS configuration
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── app/           # Expo Router file-based navigation
│   │   │   │   ├── (auth)/    # Login screens
│   │   │   │   └── (tabs)/    # Main map and booking interfaces
│   │   │   ├── components/    # Reusable UI (Buttons, Modals)
│   │   │   ├── features/      # Domain logic & hooks
│   │   │   │   ├── map/       # MapLibre rendering & offline tile logic
│   │   │   │   ├── booking/   # Booking engine & cost calculators
│   │   │   │   └── telemetry/ # GPS tracking & Hazard Pin logic
│   │   │   ├── lib/           # Third-party setup (supabase.ts, queryClient.ts)
│   │   │   └── store/         # AsyncStorage offline queue logic
│   │   └── assets/            # App icons, splash screens
│   │
│   └── web/                   # Vite React App (Estate Dashboard)
│       ├── vite.config.ts
│       ├── package.json
│       ├── src/
│       │   ├── App.tsx        # React Router setup
│       │   ├── components/    # Reusable UI
│       │   ├── features/      # Domain logic
│       │   │   ├── dashboard/ # Estate metrics & charts
│       │   │   └── 3d-viewer/ # Tier 2 WebGL/CesiumJS components
│       │   └── lib/           # Third-party setup
│       └── public/            # Static web assets
```

### Architectural Boundaries

**API Boundaries:**
- The `mobile` and `web` apps **must never** communicate directly. 
- All data flows through the `supabase` Postgres database via the JS Client.
- External API calls (like sending images to WebODM) should not be made from the mobile client directly to avoid exposing API keys. Instead, mobile uploads to a Supabase Storage bucket, which triggers a `supabase/functions/` Edge Function to talk to WebODM.

**Component Boundaries:**
- UI Components (`src/components`) must be "dumb" (pure). They take props and emit events.
- Feature Modules (`src/features`) are "smart". They contain the TanStack Query hooks that interact with Supabase.

### Requirements to Structure Mapping

**Feature/Epic Mapping (from PRD):**
*   **FR-1: Geospatial Engine:** Lives in `apps/mobile/src/features/map` and relies heavily on PostGIS functions in `supabase/migrations/`.
*   **FR-2: Booking Engine:** Lives in `apps/mobile/src/features/booking` (Mobile interface) and `apps/web/src/features/dashboard` (Estate Manager view).
*   **FR-3: Proof-of-Service Engine:** Lives in `apps/mobile/src/features/telemetry` for live tracking, routing images to Supabase Storage.

**Cross-Cutting Concerns:**
*   **Offline Sync Queue:** Managed globally via `apps/mobile/src/store/` intercepting TanStack Query mutations.
*   **Security (RLS):** Governed entirely within the database layer at `supabase/migrations/`, ensuring rules apply equally to Web and Mobile.

### Integration Points

**Internal Communication:**
The `packages/types` directory serves as the typed contract between the database (Supabase) and the frontends. When a migration is applied, types must be regenerated and distributed to `apps/mobile` and `apps/web`.

**External Integrations:**
Third-party integrations (WebODM, UPI Payment Gateways) are strictly sandboxed inside `supabase/functions/`. The frontends interact with these integrations by inserting rows into Postgres tables, triggering the Edge Function via Postgres webhooks.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All chosen technologies (Expo, Vite, Supabase, TanStack Query) are highly compatible and represent the modern standard for offline-first React development. They avoid vendor lock-in where possible and rely on open protocols.

**Pattern Consistency:**
The implementation patterns strictly govern how the different components (Mobile, Web, Backend) will interact, enforcing the `[longitude, latitude]` standard to prevent the most common GIS bugs.

**Structure Alignment:**
The monorepo structure perfectly isolates the Expo and Vite apps while safely sharing critical database types through the `packages/types` boundary.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
The directory structure explicitly reserves space for the three core PRD Epics: Geospatial Engine, Booking Engine, and Proof-of-Service Engine.

**Functional Requirements Coverage:**
All FRs are supported. Notably, FR-1.1 (AI Boundary Snap) and FR-3.2 (Proof of Service) have clear execution paths via Supabase Edge Functions.

**Non-Functional Requirements Coverage:**
The critical Offline-First NFR is fully addressed via the TanStack Query event queue and MapLibre offline packs, ensuring pilots can operate safely in zero-connectivity rural zones.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical dependencies (PowerSync vs TanStack, Supabase vs Custom NestJS) have been thoroughly debated and locked in with version targets.

**Structure Completeness:**
A complete folder tree is mapped out, providing clear guardrails for AI coding agents.

**Pattern Completeness:**
Strict rules regarding database naming, error handling, and file casing have been documented to prevent AI agent divergence.

### Gap Analysis Results

There are currently **No Critical Gaps**. The system is lean and ready for development. 

*Minor Gap (Post-MVP):* We have deferred advanced 3D Mesh visualization libraries (CesiumJS) until Tier 2, as they are not required for the initial MVP.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** **READY FOR IMPLEMENTATION**
**Confidence Level:** High

**Key Strengths:**
- Ultra-lean architecture optimized for a solo developer.
- Offloads complex infrastructure (DB, Auth, Edge Functions) to Supabase.
- Avoids over-engineered CRDT syncs in favor of predictable Event Queues.

**Areas for Future Enhancement:**
- Integration of CesiumJS or Deck.gl for Tier 2 3D mapping.
- Moving the SQLite queue to a more robust local database if the hazard pin volume scales massively.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries (never let `apps/web` import from `apps/mobile`).

**First Implementation Priority:**
Initialize the Supabase project, Expo Mobile app, and Vite Web app using the CLI commands defined in Section 3, then run `supabase gen types typescript` to populate `packages/types`.

## GeoAI Module

This module adds active, predictive, AI-driven spatial intelligence on top of the existing geospatial data spine. All surfaces read from and write to the same Supabase tables — no new database infrastructure is required.

### GeoAI Surface Summary

| Surface | Infrastructure Added | External API | Solo-Dev Tier | Status |
|---|---|---|---|---|
| Crop Stress Prediction | 2 tables + 1 Edge Function (cron) | Sentinel Hub API | Tier 1 | **Active** |
| Flight Path Optimizer | 1 PostGIS SQL function | None | Tier 1 | **Active** |
| AI Boundary Snap | 1 Edge Function | Replicate API (SAM) | Tier 2 | **Deferred** |
| Yield Prediction | ML pipeline + historical dataset | TBD | Tier 3 | **Deferred** |

---

### Surface 1: Crop Stress Prediction Engine

**Purpose:** Analyze NDVI time-series data per plot and automatically surface "Book spray?" recommendations without the farmer needing to manually inspect satellite imagery.

**Trigger:** Supabase `pg_cron` scheduled job — nightly at 02:00 IST. *(Fallback: GitHub Actions scheduled workflow invoking the Edge Function via HTTP if on Supabase free tier).*

**Data Flow:**
```
Sentinel Hub WMS API → [Edge Function: crop-stress-predictor]
                              ↓ writes
                    [plot_ndvi_snapshots table]
                    [plot_risk_scores table]
                              ↓ realtime event
                    Mobile app → heatmap overlay + "Book spray?" notification (FR-2.1)
```

**New Database Tables:**
```sql
-- Migration: 0010_create_geoai_tables.sql

CREATE TABLE plot_ndvi_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id     uuid REFERENCES farm_plots(id) ON DELETE CASCADE,
  ndvi_value  decimal(5,4) NOT NULL,   -- e.g. 0.3421
  captured_at timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL DEFAULT 'sentinel'
);

CREATE TABLE plot_risk_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id             uuid REFERENCES farm_plots(id) ON DELETE CASCADE,
  risk_level          text NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  recommended_service text,           -- e.g. 'precision-spray', 'soil-survey'
  confidence          decimal(3,2),   -- e.g. 0.87
  expires_at          timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE plot_ndvi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_risk_scores ENABLE ROW LEVEL SECURITY;
```

**Edge Function: `supabase/functions/crop-stress-predictor/index.ts`**

Logic sequence:
1. Fetch fresh Sentinel OAuth2 Bearer token using credentials from **Supabase Vault** (`vault.secrets`). Credentials must NEVER be hardcoded or exposed client-side.
2. Query all active `farm_plots` with their PostGIS boundary geometry.
3. For each plot: call Sentinel Hub WMS API → retrieve latest NDVI raster value for the plot bounding box.
4. Insert result into `plot_ndvi_snapshots`.
5. Compare against the 14-day rolling average: if NDVI drop exceeds the `crop_stress_threshold` (configurable per `crop_type`), write a `high` or `critical` risk score to `plot_risk_scores` with `expires_at: now() + interval '72 hours'`.
6. Emit a Supabase Realtime event → mobile app receives push notification.

**Party Mode Decision (Amelia):** Sentinel OAuth2 tokens expire hourly. The Edge Function MUST refresh the Bearer token at the top of each invocation using credentials fetched from `vault.secrets`. Do not cache tokens across invocations.

---

### Surface 2: Flight Path Optimizer

**Purpose:** Automatically generate a lawnmower waypoint pattern for a confirmed booking, accounting for plot shape, obstacle exclusion zones, and wind direction. Replaces manual pilot planning.

**Trigger:** Supabase Database Webhook — fires when `bookings.status` transitions to `confirmed`.

**Edge Function: `supabase/functions/flight-path-optimizer/index.ts`**
Instead of raw PostGIS, this uses Turf.js for maintainable computational geometry.

Logic sequence:
1. Fetch plot boundary from `farm_plots`.
2. Fetch hazard pins for the plot from `hazard_pins`.
3. Use `turf.buffer()` to create 10m exclusion zones around hazards.
4. Use `turf.difference()` to subtract hazards from the plot boundary.
5. Use `turf.lineGrid()` to generate lawnmower sweeps, rotated by wind bearing.
6. Write generated GeoJSON waypoints to `bookings.flight_waypoints` with `waypoint_status: 'pending_pilot_review'`.

**Output Storage:** GeoJSON waypoints written to `bookings.flight_waypoints`.

**Party Mode Decision (John + Winston):** The AI generates; the human approves. The Pilot App MUST render the generated waypoints as an editable polyline overlay on MapLibre Native. The pilot can drag individual waypoints before approving. Only after explicit pilot approval does the confirmed KMZ get transmitted to the DJI/MAVLink flight controller. Auto-fly without human review is strictly forbidden.

---

### Surface 3: AI Boundary Snap (Deferred — Tier 2)

**Purpose:** When a user draws a rough polygon on the mobile map, an AI model refines it to snap precisely to actual crop field boundaries visible in the satellite imagery.

**Why Deferred:** 
- The primary Tier 1 personas (Farm Managers/Smallholders) typically already have boundaries from government records or previous surveys.
- Deferring this eliminates the Replicate API dependency and simplifies Tier 1 launch.

**Deferred Architecture Sketch:**
- Trigger: User submits a rough polygon from the mobile app (FR-1.1 — Draw & Snap).
- Online-Only Constraint: This feature is explicitly online-only (flagged in architecture constraints). Offline fallback: save the raw user polygon, show toast — *"Boundary snap unavailable offline. Your polygon will be refined when connectivity is restored."*

**Data Flow:**
```
Mobile (MapLibre): user draws rough polygon
      ↓ POST { rough_geojson, map_bbox } to supabase/functions/boundary-snap
      ↓ Edge Function fetches Mapbox satellite tile for bbox
      ↓ Calls Replicate API (Segment Anything Model or lightweight crop-boundary ONNX model)
      ↓ Returns refined GeoJSON polygon
      ↓ Mobile previews snapped boundary overlay for user approval
      ↓ User confirms → saved to farm_plots.boundary
```

**Why Replicate API:** No GPU infrastructure for a solo developer. Pay-per-inference pricing (~$0.002/call). Zero cold-start overhead. API key stored in Supabase Vault.

**Edge Function:** `supabase/functions/boundary-snap/index.ts`

---

### Surface 4: Yield Prediction (Deferred — Tier 3)

**Purpose:** Predict end-of-season crop yield for a given plot based on multi-season NDVI time-series, historical spray records, rainfall data, and soil type.

**Why Deferred:**
- Requires 2–3 seasons of historical NDVI snapshots from `plot_ndvi_snapshots` before a model can be trained with statistically meaningful accuracy.
- Requires a labelled training dataset pairing NDVI histories with actual harvested yield weights (collected from farmers post-harvest).
- Model training and hosting requires infrastructure beyond a simple Edge Function (likely a Python microservice or a managed ML platform like Vertex AI).

**Deferred Architecture Sketch (for future planning):**
- Data Collection: `plot_ndvi_snapshots` is already capturing the training features from Tier 1. Harvest yield data needs a new `harvest_records` table (simple manual entry by Farm Manager at season end).
- Model Type: Gradient Boosted Trees (XGBoost / LightGBM) on tabular NDVI time-series features. Lightweight, interpretable, and deployable as a Supabase Edge Function WASM binary in Tier 3.
- Output: `plot_yield_forecasts` table → displayed as a "Projected Yield" card on the Estate Owner dashboard.

**Implementation Gate:** Do not begin Yield Prediction until `plot_ndvi_snapshots` contains a minimum of two complete crop seasons of data per active plot.

---

### GeoAI Security Rules

All AI agents implementing GeoAI features MUST follow these rules in addition to the standard enforcement guidelines:

- **Sentinel API credentials** (`SENTINEL_CLIENT_ID`, `SENTINEL_CLIENT_SECRET`) → stored exclusively in `vault.secrets`. Never in `.env` files committed to the repository.
- **Replicate API key** → stored exclusively in `vault.secrets`. Never called from the mobile or web client.
- **All AI-generated outputs** (risk scores, waypoints, snapped boundaries) MUST be stored with a `confidence` score and `expires_at` timestamp. Stale AI outputs must be invalidated and never silently re-used.
- **Flight waypoints** MUST enter `waypoint_status: 'pending_pilot_review'` and require explicit human approval before any KMZ export or MAVLink transmission.

---

## Hardened Implementation Requirements

Based on advanced stress testing and edge-case sweeps, the following implementation strategies MUST be followed to ensure the system is robust for a solo developer:

1. **Background Uploads:** Standard background tasks will be throttled by the OS. All TUS resumable uploads (e.g., for WebODM drone imagery) MUST utilize **Foreground Service APIs on Android** and **URLSession on iOS** with persistent notifications. The upload retry mechanism MUST use **Exponential Backoff with Jitter** to prevent battery drain and API rate-limiting during network flapping.
2. **Strict GeoJSON Typing:** Relying on Supabase's auto-generated TS types for PostGIS columns is unsafe (they default to `string`). We MUST create a `packages/types/database.override.ts` to enforce `@types/geojson` structures using TypeScript utility types (e.g., `Omit`).
3. **GeoJSON Runtime Validation:** Even with strict types, we MUST run **Zod Runtime Validation** at the API boundary before passing geometries to MapLibre. The schema must enforce a **Vertex Hard Limit** (e.g., max 5,000 vertices) and the backend should use `ST_SimplifyPreserveTopology` to prevent massive polygons from crashing the native renderer.
4. **Local DB Integration Testing:** Do not mock database calls for GeoAI features. We MUST use **Vitest** configured to run against the local Supabase emulator (`supabase start`). The CI pipeline MUST spin up this container to validate all PostGIS SQL functions.
5. **Emergency UX Fallback ("Unsynced Hazard"):** If a Farm Manager drops a hazard pin *after* the pilot has checked out and gone offline, it enters an "Unsynced" state (pulsing red UI). This must trigger a forced human intervention using **Masked Telephony** (e.g., Exotel/Twilio) via a "Call Pilot Now" button. The masked number expiration must be tied strictly to the Pilot Checkout Cryptographic Signature, not the scheduled booking time.
