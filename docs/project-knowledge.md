# Skynet Drone Services — Project Knowledge Base

> **Purpose:** This document is the single source of truth for all AI agents working on Skynet.
> Any agent invoked on this project (via `bmad-help`, `bmad-quick-dev`, `bmad-dev-story`, etc.)
> MUST read this file before taking any action. It captures every key decision, rationale, and
> constraint so that no context is ever lost between sessions.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | Skynet Drone Services |
| **Owner / Solo Dev** | terminator |
| **Domain** | Drone-as-a-Service (DaaS), AgriTech, Tamil Nadu India |
| **PRD Status** | ✅ Final (`output/planning-artifacts/prd/skynet-drone-services/prd.md`) |
| **Architecture Status** | ✅ Complete (`output/planning-artifacts/architecture.md`) |
| **Current Phase** | Implementation — Ready to initialize repositories |

---

## 2. The One-Line Pitch

> **Skynet is the physical execution layer for smart agriculture.**
> Satellite data (from Sentinel / AgriTwin) tells farmers *what* to fix.
> Skynet dispatches DGCA-certified drone pilots to *fix it* — with full proof-of-service.

---

## 3. Target Personas

| Persona | Role | Core Need |
|---|---|---|
| **A: Estate Owner / Investor** | Owns large or multiple tracts of land, manages remotely | High-level aggregate dashboard, "Telescope View" traffic-light health coding, financial summaries |
| **B: Farm Manager / Caretaker** *(Primary)* | Boots on the ground, day-to-day operations | Map-First interface, large touch targets, proactive task prompts (e.g., "High weed density — Book spray?") |
| **C: DGCA Drone Pilot** | Receives job, travels to site, executes spray / survey | Clear KMZ field boundaries, obstacle warnings, offline-first sync, proof-of-service checklist |
| **D: Smallholder / FPO Member** | Owns 1–5 acres, local Tamil Nadu operator | Simple fast booking without complex map hierarchies |

---

## 4. Capability Tiers (Roadmap)

The architecture was explicitly designed to support this progression without rip-and-replace rewrites.

| Capability | **Tier 1 — MVP** (Months 0–6) | **Tier 2 — v1.5** (Months 6–12) | **Tier 3 — v2.0+** |
|---|---|---|---|
| Imaging & Output | Orthomosaic (2D), NDVI | DEM/DSM, 3D Mesh | Topographic Surveys (cm-accuracy) |
| Sensor Required | RGB camera + External Satellite | RGB camera | LiDAR (.laz) |
| Processing Engine | **WebODM Lightning API** (third-party) | OpenDroneMap (Extended) | PDAL / LAStools |
| Mobile Visualization | 2D tiles, NDVI & Satellite overlays | Hillshade / Elevation colormap | Simplified contour view |
| Web Dashboard | None (Mobile-first) | Full 3D mesh viewer (CesiumJS) | Full point cloud inspector |
| Primary Persona | Farm Manager, Pilot, Smallholder | Estate Owner, FPO | Infrastructure / Gov |

> ⚠️ **Critical:** CesiumJS and all 3D libraries are **deferred to Tier 2**. Do not implement them in Tier 1 work.

---

## 5. Approved Technology Stack

This stack is **locked**. Do not suggest or implement alternatives without explicit user approval.

### Mobile App — Field Node
| Decision | Choice | Rationale |
|---|---|---|
| Framework | **Expo (React Native)** | Cross-platform, OTA updates, MapLibre native support |
| Navigation | **Expo Router** (file-based) | Zero boilerplate navigation |
| Map Library | **MapLibre Native** | Hardware-accelerated, supports offline tile packs natively |
| Offline Maps | **MapLibre offline packs** | No tile server required — device handles caching |
| State / Server | **TanStack Query v5** | Offline mutation queuing + server state caching |
| Local Storage | **AsyncStorage** | Lightweight offline event queue |
| Builds / CI | **Expo EAS** | Cloud builds, OTA updates, no Xcode/Android Studio required |
| Language | **TypeScript (Strict)** | Enforced across all apps |
| Styling | **React Native StyleSheet** | No Tailwind or NativeWind |

### Web Dashboard — Estate View
| Decision | Choice | Rationale |
|---|---|---|
| Framework | **Vite + React** | Fast HMR, code-splitting, Rollup bundler |
| Map Library | **Mapbox GL JS** | Heavy vector tile and WMS satellite layer support |
| State / Server | **TanStack Query v5** | Consistent with mobile |
| Local UI State | **Zustand** | Minimal boilerplate for ephemeral UI state |
| Styling | **Vanilla CSS / CSS Modules** | No Tailwind |
| Deployment | **Vercel** (or Netlify) | Zero-config Vite deployment |
| Language | **TypeScript (Strict)** | |

### Backend — Control Plane
| Decision | Choice | Rationale |
|---|---|---|
| Platform | **Supabase (BaaS)** | Managed PostgreSQL + PostGIS + Auth + Edge Functions + Storage |
| Database | **PostgreSQL 15+ with PostGIS** | Spatial SQL queries eliminate need for a custom Geospatial Engine |
| Auth | **Supabase Auth + Row Level Security (RLS)** | Tenant isolation enforced at the database level |
| RBAC | **Supabase JWT claims** | Pilot vs. Farm Manager role separation |
| Serverless Logic | **Supabase Edge Functions (Deno/TS)** | Webhooks to WebODM, UPI gateway triggers |
| File Storage | **Supabase Storage (TUS protocol)** | Resumable chunked uploads for large drone imagery |
| Local Dev | **Supabase CLI** | `npx supabase init` + local PostgreSQL emulator |
| Type Safety | **`supabase gen types typescript`** | Auto-generates TS types into `packages/types/` |

### External Services
| Service | Purpose | Tier |
|---|---|---|
| **WebODM Lightning API** | Photogrammetry processing (orthomosaics) | Tier 1 MVP |
| **Sentinel / AgriTwin WMS** | External NDVI / NDMI / EVI satellite layers | Tier 1 MVP |
| **UPI Gateways (PhonePe, GPay)** | Payment processing | Tier 1 MVP |
| **DJI / MAVLink SDK** | Transmitting KMZ boundaries & hazard pins to flight controller | Tier 1 MVP |

---

## 6. Key Architectural Decisions (with Rationale)

### ❌ REJECTED: Custom NestJS Backend
**Why rejected:** NestJS requires manually managing the Postgres database and logical replication infrastructure. As a solo developer, this would cost months of DevOps work before a single line of business logic was written.

### ❌ REJECTED: PowerSync / ElectricSQL (CRDT Engine)
**Why rejected:** CRDTs (Conflict-free Replicated Data Types) solve multi-device offline conflict merging. However, if both the Farm Manager and Pilot are in a zero-connectivity zone, no sync engine can transfer data between their devices anyway — they would need a local mesh network. CRDTs only solve the database merge conflict *after* both devices reconnect. Instead, we use a simpler **UX constraint ("Check-Out" rule)** + an **AsyncStorage Append-Only Event Queue** that flushes mutations to Supabase on reconnection.

### ❌ REJECTED: Custom Geospatial Map Engine / Tile Server
**Why rejected:** Supabase provides PostGIS out of the box, which handles all spatial queries (radius search, polygon acreage, pilot routing). The mobile device handles map rendering via MapLibre Native. Vendors (Mapbox/MapLibre) handle offline tile caching. A custom tile server is unnecessary infrastructure overhead.

### ✅ ACCEPTED: Offline "Check-Out" UX Rule
**The safety mechanism replacing CRDTs:** Before a Pilot leaves a Wi-Fi zone to travel to a rural farm, the app forces a mandatory "Sync Flight Plan" action. This downloads all current hazard pins to their device. Once the pilot status is "In Transit" or "Flying", the system prevents the Farm Manager from silently adding new hazard pins without a clear warning: *"Pilot is already dispatched. Call them directly to report this hazard."*

### ✅ ACCEPTED: WebODM Lightning (Outsourced Photogrammetry)
Instead of self-hosting an OpenDroneMap container (requires Docker, significant compute), the mobile app uploads raw drone images to Supabase Storage, which triggers a Supabase Edge Function to call the WebODM Lightning API. The Edge Function handles the long-polling and writes the resulting orthomosaic URL back to the database.

### ✅ ACCEPTED: Monorepo with NPM Workspaces
The three project surfaces (mobile, web, backend) share a single repository to safely share TypeScript types generated from the Supabase schema. A `packages/types/` directory acts as the typed contract between the database and all frontends.

---

## 7. Monorepo Directory Structure

```text
skynet-monorepo/
├── package.json               # Root NPM Workspace config
├── supabase/                  # Backend Infrastructure
│   ├── config.toml
│   ├── migrations/            # SQL: tables, RLS policies, PostGIS extensions
│   ├── functions/             # Deno Edge Functions (WebODM webhook, UPI trigger)
│   └── seed.sql               # Dev mock data
├── packages/
│   ├── types/                 # Auto-generated Supabase DB types (`supabase gen types typescript`)
│   └── utils/                 # Shared formatting/validation helpers
├── apps/
│   ├── mobile/                # Expo React Native App
│   │   └── src/
│   │       ├── app/           # Expo Router (auth, tabs)
│   │       ├── components/    # Dumb UI components
│   │       ├── features/
│   │       │   ├── map/       # MapLibre, offline tile logic
│   │       │   ├── booking/   # Cost calculator, dispatch
│   │       │   └── telemetry/ # GPS track, hazard pins, proof-of-service
│   │       ├── lib/           # supabase.ts, queryClient.ts
│   │       └── store/         # AsyncStorage offline queue
│   └── web/                   # Vite React App (Estate Dashboard)
│       └── src/
│           ├── features/
│           │   ├── dashboard/ # Estate metrics, charts
│           │   └── 3d-viewer/ # [TIER 2 ONLY] CesiumJS viewer
│           └── lib/
```

---

## 8. Implementation Patterns — Mandatory Rules

All AI agents writing code for this project MUST follow these rules.

### Naming Conventions
| Target | Convention | Example |
|---|---|---|
| Database Tables | `snake_case`, plural | `farm_plots`, `hazard_pins`, `bookings` |
| Database Columns | `snake_case`, singular | `plot_id`, `created_at`, `pilot_id` |
| Foreign Keys | `{table_singular}_id` | `pilot_id`, `booking_id` |
| React Components | `PascalCase` | `HazardPin.tsx`, `BookingCard.tsx` |
| Custom Hooks | `camelCase`, starts with `use` | `useSyncQueue.ts`, `useOfflineMap.ts` |
| Utility Functions | `camelCase` | `formatGpsCoordinates.ts` |
| Env Variables | `UPPER_SNAKE_CASE` | `EXPO_PUBLIC_SUPABASE_URL` |
| TanStack Query Keys | Strictly typed arrays | `['hazard_pins', 'list', plotId]` |
| AsyncStorage Keys | Prefixed with `offline_queue:` | `offline_queue:hazard_pins` |

### Critical Data Format Rules
- **Coordinates:** ALWAYS `[longitude, latitude]` order (GeoJSON standard). This is the #1 GIS bug. Never swap the order.
- **Timestamps:** Always stored and transmitted as UTC `ISO-8601` strings. Never use Unix timestamps or local time.
- **Booleans:** `true`/`false` only. Never `1`/`0`.

### Supabase API Rules
- Always destructure `{ data, error }` from every Supabase SDK call.
- NEVER assume `data` is present without first checking `if (error)`.
- NEVER throw errors for expected API failures. Handle gracefully and show a toast notification.
- NEVER write raw SQL via REST endpoints. Use the standard Supabase JS client builder methods (`supabase.from('...').select(...)`).
- NEVER put Supabase `service_role` key on the client (mobile/web). Only `anon` key is safe client-side.

### Architectural Boundary Rules
- `apps/mobile` and `apps/web` MUST NEVER import from each other.
- All shared code goes in `packages/`. All data flows through Supabase.
- External API calls (WebODM, UPI) MUST be sandboxed inside `supabase/functions/` Edge Functions. Never call external APIs with secret keys from the client.

---

## 9. Initialization Commands (First Story)

When starting implementation, run these commands in order:

```bash
# 1. Initialize Supabase backend
npx supabase init

# 2. Initialize Expo mobile app
npx create-expo-app@latest apps/mobile --template default@sdk-56

# 3. Initialize Vite web dashboard
npm create vite@latest apps/web -- --template react-ts

# 4. Generate Supabase TypeScript types (run after every migration)
npx supabase gen types typescript --local > packages/types/database.ts
```

---

## 10. Functional Requirements Summary

### FR-1: Geospatial & Hierarchy Engine
- **FR-1.1:** Boundary ingestion — KML/KMZ upload, Government API, Drone Mapping booking, AI Draw-&-Snap polygon.
- **FR-1.2:** Tenant hierarchy — Parent (Estate/Owner, view-only) → Child (Plot/Manager, bookings enabled).
- **FR-1.3:** Map layer toggling — Satellite, NDVI, Weather, Soil Moisture, Elevation, Pest Heatmap.
- **FR-1.4:** Proactive offline map caching — tiles and boundaries downloaded to device automatically.
- **FR-1.5:** Ground-Truthing & Hazard Pins — geotagged photos, pin types (Tree, Power Line, Pest), cryptographic pilot acknowledgment before flight unlock.
- **FR-1.6:** External WMS/WMTS GIS ingestion — Sentinel, AgriTwin satellite layers.

### FR-2: Booking & Dispatch Engine
- **FR-2.1:** Services menu with proactive AI recommendations based on NDVI data.
- **FR-2.2:** Automated acreage-based cost & chemical quantity calculator.
- **FR-2.3:** Telephony helpline integration for non-digital farmers.
- **FR-2.4:** Algorithmic pilot dispatch — nearest available DGCA pilot, multi-job route optimization.

### FR-3: Proof-of-Service Engine (Trust & Payments)
- **FR-3.1:** Real-time GPS telemetry recording (≥1Hz) during flight.
- **FR-3.2:** Automated coverage report generation — field boundary + flight path overlay.
- **FR-3.3:** Geo-tagged media evidence — chemical mix photo + completion photo attached to report.
- **FR-3.4:** UPI payment + GST-compliant invoice generation post-approval.
- **FR-3.5:** Pilot rating system (1–5 stars) with priority dispatch for high-rated pilots.

---

## 11. Non-Functional Requirements

- **Offline-First:** App must be fully functional (map view, hazard pins, bookings) with zero internet connectivity. Mutations queue locally and sync on reconnection.
- **Performance:** Smooth 60fps map rendering with multi-layer toggling on mid-range Android devices.
- **Storage:** Supabase Storage with TUS resumable uploads for gigabyte-scale drone imagery.
- **Compliance:** Indian DPDP Act data residency for geospatial data. PCI-DSS for UPI payments.
- **Safety:** Hazard pins cryptographically acknowledged by pilot app before flight start is unlocked.
- **Telemetry:** GPS track ≥1Hz sampling with explicit error handling for mid-flight connection drops.

---

## 12. Current Workflow Status

| Phase | Status | Artifact |
|---|---|---|
| Market Research | ✅ Complete | `output/planning-artifacts/research/` |
| PRD | ✅ Final | `output/planning-artifacts/prd/skynet-drone-services/prd.md` |
| Architecture | ✅ Complete | `output/planning-artifacts/architecture.md` |
| Epics & Stories | ⬜ Not Started | `output/planning-artifacts/epics/` |
| Implementation | ⬜ Not Started | Repository initialization is Step 1 |
| Testing | ⬜ Not Started | |

### Recommended Next Step
Invoke **`bmad-create-epics-and-stories`** to break the PRD and Architecture into actionable user stories, OR invoke **`bmad-quick-dev`** to begin repository initialization immediately using the CLI commands in Section 9.

---

## 13. Decision Log Reference

| # | Decision | Outcome |
|---|---|---|
| 1 | Backend Framework | Supabase BaaS over NestJS |
| 2 | Offline Sync Engine | TanStack Query + AsyncStorage over PowerSync / CRDTs |
| 3 | Map Engine | No custom tile server — PostGIS + MapLibre vendor caching |
| 4 | Photogrammetry | WebODM Lightning API (outsourced) over self-hosted ODM |
| 5 | 3D Visualization | Deferred to Tier 2 — no CesiumJS in Tier 1 |
| 6 | Hazard Pin Safety | UX "Check-Out" rule replaces CRDT conflict resolution |
| 7 | Repo Structure | NPM Workspace Monorepo with `packages/types` shared types |
| 8 | CI/CD | Expo EAS (mobile) + Vercel (web) |
| 9 | GeoAI: Crop Stress | Supabase pg_cron + Sentinel Hub API → `plot_risk_scores` table |
| 10 | GeoAI: Flight Path | Edge Function + Turf.js. Pilot must approve before KMZ export as a suggestion overlay. |
| 11 | GeoAI: Boundary Snap | Deferred to Tier 2 — removes Replicate API dependency for MVP launch. |
| 12 | GeoAI: Yield Prediction | Deferred to Tier 3 — requires 2+ seasons of `plot_ndvi_snapshots` training data |
| 13 | GeoAI Security | All external AI API keys in `vault.secrets` only. AI outputs require `confidence` + `expires_at`. |
