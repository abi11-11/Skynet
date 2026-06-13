---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - output/planning-artifacts/prd/skynet-drone-services/prd.md
  - output/planning-artifacts/architecture.md
---

# skynet - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for skynet, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1.1: Land Boundary Ingestion & Integration (Direct Upload, Gov Integration, Drone Mapping, AI Draw & Snap)
FR-1.2: Tenant-Based Hierarchical Plot Management (Parent Tenant view only, Child Tenant operational)
FR-1.3: Visual Layer Toggling (Base, Health/NDVI, Weather, Soil Moisture, Topo/Elevation, Pest Heatmap)
FR-1.4: Proactive Map Caching (Offline Mode) (Automatically download map tiles and boundary data)
FR-1.5: Ground-Truthing & Hazard Annotation (Drop pins, attach photos, transmit to pilot, exact coordinates)
FR-1.6: External GIS Data Ingestion (Support external WMS/WMTS like Sentinel/AgriTwin)
FR-2.1: Comprehensive Services Menu & Contextual Recommendations (Services list, Proactive AI push notifications, Dedicated page)
FR-2.2: Automated Requirement & Cost Calculation (Calculate exact chemical amount and flight cost based on acreage)
FR-2.3: Telephony Helpline Integration (Direct button to Skynet support for manual booking)
FR-2.4: Pilot Dispatch & Routing Engine (Algorithmic dispatch to nearest pilot, multi-job route optimization)
FR-3.1: Real-Time GPS Track Recording (Live tracking during flight ≥1Hz)
FR-3.2: Automated Coverage Reports (Boundary + flight path overlay report post-flight)
FR-3.3: Geo-tagged Media Evidence (Pre-flight chemical mix photo and post-flight completion photo)
FR-3.4: Payments & Invoicing (UPI integrations + GST digital receipt upon report approval)
FR-3.5: Pilot Rating & Feedback System (1-5 star rating, prioritize high-rated pilots)

### NonFunctional Requirements

NFR-1: Async Processing Pipeline (Imagery processed asynchronously via Queue -> ODM -> COG)
NFR-2: Storage Scalability (Scalable object storage for gigabytes of imagery)
NFR-3: Conflict Resolution (Local-first DB with TanStack Query + AsyncStorage event queue, replacing CRDTs, Check-out rule)
NFR-4: High-Bandwidth Ingestion (Resumable chunked local ingest and background cloud syncing)
NFR-5: Telemetry Integrity (GPS recording ≥1Hz with error handling for drops)
NFR-6: Hazard Acknowledgment (Cryptographic pilot confirmation of hazards to unlock flight)
NFR-7: Data Residency & Payments (DPDP Act compliance, PCI-DSS for UPI)
NFR-8: Hardware Contracts (Strict KMZ/hazard transmission definitions to DJI/MAVLink)
NFR-9: Hardened Uploads (Foreground Service APIs Android / URLSession iOS with Exponential Backoff)
NFR-10: Hardened Map Rendering (Zod Runtime Validation with 5k vertex hard limit + backend ST_Simplify)
NFR-11: Hardened Emergency Fallback (Masked Telephony for unsynced hazard pins, expiring on checkout signature)

### Additional Requirements

- **Starter Template**: Expo (React Native) for Mobile, Vite (React+TS) for Web, Supabase (PostgreSQL 15+ with PostGIS) for Backend.
- Monorepo structure using NPM Workspaces.
- Shared TypeScript types generated via `supabase gen types typescript` and strictly typed for GeoJSON via `Omit`.
- State management and offline caching using TanStack Query v5 + AsyncStorage.
- CI/CD using Expo EAS (Mobile) and Vercel (Web).
- Testing via Vitest against local `supabase start` Docker emulator.
- GeoAI Crop Stress predictor running via pg_cron against Sentinel API.
- GeoAI Flight Path Optimizer using Edge Function + Turf.js.
- Strict security: All external API keys in `vault.secrets` only.

### UX Design Requirements

*No distinct UX Design Specification document was found.*

### FR Coverage Map

FR-1.1: Epic 1 - Land Boundary Ingestion (Upload, Gov API, AI Draw)
FR-1.2: Epic 1 - Tenant-Based Hierarchical Plot Management
FR-1.3: Epic 5 - Visual Layer Toggling (NDVI, Weather, Soil Moisture)
FR-1.4: Epic 1 - Proactive Map Caching (Offline Mode)
FR-1.5: Epic 2 - Ground-Truthing & Hazard Annotation (Pins + Photos)
FR-1.6: Epic 5 - External GIS Data Ingestion (Sentinel/AgriTwin WMS)
FR-2.1: Epic 5 - Comprehensive Services Menu & Contextual AI Recommendations
FR-2.2: Epic 3 - Automated Requirement & Cost Calculation based on Acreage
FR-2.3: Epic 3 - Telephony Helpline Integration for offline farmers
FR-2.4: Epic 3 - Pilot Dispatch & Routing Engine
FR-3.1: Epic 4 - Real-Time GPS Track Recording (≥1Hz)
FR-3.2: Epic 4 - Automated Coverage Reports (Boundary + flight path overlay)
FR-3.3: Epic 4 - Geo-tagged Media Evidence (Chemical mix + completion photos)
FR-3.4: Epic 4 - Payments & Invoicing (UPI + GST receipt)
FR-3.5: Epic 4 - Pilot Rating & Feedback System

## Epic List

### Epic 1: Field Navigation & Land Management
**Goal:** Farm Managers and Pilots can securely authenticate, view their land boundaries on a MapLibre interface, and proactively cache this data for zero-connectivity offline use in rural areas.
**FRs covered:** FR-1.1, FR-1.2, FR-1.4

### Epic 2: Ground-Truthing & Mission Safety
**Goal:** Farm Managers can log physical hazards (with photos) on the map. The system ensures pilots explicitly acknowledge these hazards before unlocking flights, utilizing the "Emergency Unsynced" telephony fallback if connections drop.
**FRs covered:** FR-1.5

### Epic 3: Drone Service Booking & Pilot Dispatch
**Goal:** Farm Managers can book spot-spraying or mapping services with automated, acreage-based cost calculations, or use a telephony helpline. The platform algorithmically routes the job to the optimal DGCA pilot, using hazard pins to optimize the flight path.
**FRs covered:** FR-2.2, FR-2.3, FR-2.4

### Epic 4: Verifiable Proof of Service & Trust
**Goal:** Pilots can record live GPS flight tracks and geo-tagged media. Estate Owners receive a transparent coverage report overlay, triggering UPI billing and pilot rating loops.
**FRs covered:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5

### Epic 5: Farm Intelligence & Proactive Insights (GeoAI)
**Goal:** Farm Managers can toggle advanced environmental layers (NDVI, weather, soil moisture) and receive automated AI crop stress recommendations to make targeted agronomic decisions.
**FRs covered:** FR-1.3, FR-1.6, FR-2.1

## Epic 1: Field Navigation & Land Management

**Goal:** Farm Managers and Pilots can securely authenticate, view their land boundaries on a MapLibre interface, and proactively cache this data for zero-connectivity offline use in rural areas.

### Story 1.1: Platform Foundation & Authentication

As a Skynet User (Manager/Pilot),
I want to securely authenticate into the mobile or web application,
So that my farm data is kept private and secure.

**Acceptance Criteria:**

**Given** the repository is empty
**When** initialized
**Then** an NPM workspace monorepo is created containing apps/mobile, apps/web, supabase, and packages/types
**And** basic Supabase email/password authentication is wired up to issue a JWT that is explicitly persisted using `expo-secure-store` (not standard AsyncStorage), ensuring encryption at rest

### Story 1.2: Tenant-Based Plot Management (Database & API)

As an Estate Owner,
I want to securely define hierarchical plots (tenants) in the system,
So that my Farm Managers only see the plots assigned to them.

**Acceptance Criteria:**

**Given** Supabase is configured
**When** the database migration runs
**Then** the `farm_plots` table is created with strict PostGIS geometry columns
**And** Row Level Security (RLS) policies restrict query results to the user's assigned plot IDs

### Story 1.3: Boundary Rendering & Strict GeoJSON Typing

As a Farm Manager,
I want to visualize my plot boundaries on a high-performance satellite map,
So that I can accurately oversee my physical fields.

**Acceptance Criteria:**

**Given** the database schema exists
**When** TS types are generated
**Then** `packages/types/database.override.ts` enforces strict `@types/geojson` structures using `Omit`
**And** when a boundary passes Zod runtime validation, MapLibre Native renders it as a colored polygon overlay

### Story 1.4: Proactive Map Caching (Offline Mode)

As a Drone Pilot,
I want the app to automatically cache my assigned plot maps,
So that I can view the boundary lines in rural areas with zero internet connectivity.

**Acceptance Criteria:**

**Given** a pilot is online viewing their assigned jobs
**When** the screen mounts
**Then** MapLibre offline packs trigger a background download of the required raster tiles
**And** if the device loses connection, TanStack Query serves the boundary data from AsyncStorage within 500ms, and explicitly displays a global 'Offline Mode' toast indicator to warn the pilot

## Epic 2: Ground-Truthing & Mission Safety

**Goal:** Farm Managers can log physical hazards (with photos) on the map. The system ensures pilots explicitly acknowledge these hazards before unlocking flights, utilizing the "Emergency Unsynced" telephony fallback if connections drop.

### Story 2.1: Hazard Annotation & Photo Upload

As a Farm Manager,
I want to drop hazard pins and attach geotagged photos directly on my map,
So that I can document obstacles like power lines or dead trees for the pilot.

**Acceptance Criteria:**

**Given** a Farm Manager views a plot
**When** they long-press on the map
**Then** a `hazard_pins` row is created with precise `[longitude, latitude]` coordinates
**And** they can capture an image that is uploaded to Supabase Storage linked to that pin

### Story 2.2: Offline Pin Queue & Background Sync

As a Farm Manager,
I want to drop hazard pins even when my phone has no internet signal,
So that I can accurately document hazards while walking deep in the physical field.

**Acceptance Criteria:**

**Given** the device has no internet connection
**When** a pin is dropped
**Then** the mutation is intercepted and saved to an `AsyncStorage` offline queue that is explicitly namespaced by the user's ID to prevent cross-user sync collisions
**And** when the network connection is restored, TanStack Query automatically replays the queued mutations to sync them to the database

### Story 2.3: Mission Safety Check-Out Rule

As a Drone Pilot,
I want the app to force me to acknowledge all documented hazards before I can start my flight,
So that I do not accidentally crash the drone into a known obstacle.

**Acceptance Criteria:**

**Given** a booked flight with associated hazard pins
**When** the pilot opens the flight view
**Then** the primary "Begin Flight" button is disabled
**And** when the pilot explicitly taps to acknowledge every visible hazard pin, the button unlocks and records a timestamped signature

### Story 2.4: Emergency "Unsynced" Telephony Fallback

As a Farm Manager,
I want an emergency way to contact the pilot if I discover a hazard while they are already offline and prepping to fly,
So that I can warn them before they launch the drone into the new obstacle.

**Acceptance Criteria:**

**Given** a pilot has completed their Check-Out signature
**When** the Farm Manager drops a new hazard pin on that plot
**Then** the pin renders with a pulsing red "Unsynced" status
**And** tapping the pin reveals an "Emergency Call Pilot" button which triggers a masked API call (e.g., Exotel/Twilio) to the pilot's phone

## Epic 3: Drone Service Booking & Pilot Dispatch

**Goal:** Farm Managers can book spot-spraying or mapping services with automated, acreage-based cost calculations, or use a telephony helpline. The platform algorithmically routes the job to the optimal DGCA pilot, using hazard pins to optimize the flight path.

### Story 3.1: Service Catalog & Area Cost Calculator

As a Farm Manager,
I want to select a drone service and see an exact cost quote based on my plot size,
So that I know exactly how much chemical and money is required before confirming the booking.

**Acceptance Criteria:**

**Given** a selected plot on the map
**When** the user opens the booking sheet
**Then** the total acreage is computed instantly from the GeoJSON polygon using Turf.js `area()`
**And** when a service is selected, the required chemical volume and total flight cost are calculated using explicit mock constants (e.g., Area * 10L/Acre for volume, Area * ₹800/Acre for cost) and displayed

### Story 3.2: Flight Path Optimizer (Edge Function)

As a Drone Pilot,
I want the system to automatically generate a safe flight path around logged hazards,
So that I don't have to manually draw lawnmower sweeps while sweating in the field.

**Acceptance Criteria:**

**Given** a booking status changes to `confirmed`
**When** the Supabase webhook fires
**Then** the `flight-path-optimizer` Edge Function is triggered
**And** Turf.js creates 10m exclusion buffers around the hazards, generates a lawnmower line grid, and saves the waypoints to the database (if the buffers cover the entire plot, it gracefully sets the booking to 'unflyable' instead of crashing)

### Story 3.3: Pilot Dispatch & Routing Engine

As a Farm Manager,
I want my confirmed booking to be automatically assigned to the nearest pilot,
So that the job is executed quickly without me having to make manual phone calls.

**Acceptance Criteria:**

**Given** a new booking
**When** the dispatch query runs
**Then** PostGIS `ST_DWithin` locates active pilots within a 50km radius
**And** the closest available pilot is assigned the job and receives a real-time push notification

### Story 3.4: Telephony Helpline Integration

As a Smallholder Farmer,
I want a direct button to call the Skynet helpline,
So that a human agent can assist me if I struggle to navigate the digital booking flow.

**Acceptance Criteria:**

**Given** the booking screen
**When** the user is viewing the service list
**Then** a prominent "Need Help? Call Us" button is visible
**And** tapping the button opens the native OS phone dialer with the Skynet support number pre-filled

## Epic 4: Verifiable Proof of Service & Trust

**Goal:** Pilots can record live GPS flight tracks and geo-tagged media. Estate Owners receive a transparent coverage report overlay, triggering UPI billing and pilot rating loops.

### Story 4.1: Live Telemetry Recording & Ingestion

As a Drone Pilot,
I want the app to record my GPS flight track automatically while I fly,
So that I can prove mathematically that I covered the entire field.

**Acceptance Criteria:**

**Given** an active flight mission
**When** the drone is flying
**Then** the Expo mobile app records precise GPS coordinates at a frequency of ≥1Hz
**And** if offline, telemetry is queued locally and streamed via a chunked upload upon reconnection, with a strict 50MB storage hard cap and a 7-day TTL pruner to prevent device OOM crashes

### Story 4.2: Geo-Tagged Media Evidence

As a Drone Pilot,
I want to upload photos of my chemical mix and the finished field,
So that I can provide visual proof of the service quality and chemical compliance.

**Acceptance Criteria:**

**Given** a flight mission workflow
**When** prompted before takeoff and after landing
**Then** the pilot can capture geo-tagged photos
**And** the images are compressed on-device to < 1MB (via `expo-image-manipulator`) before uploading to Supabase Storage and permanently linking to the specific `bookings` row

### Story 4.3: Automated Coverage Report Generation

As an Estate Owner,
I want to receive a visual coverage report immediately after the flight,
So that I can verify the drone did not miss any corners of my plot before I pay.

**Acceptance Criteria:**

**Given** a completed flight with synced telemetry
**When** the Estate Owner opens the dashboard
**Then** they see a "Coverage Report"
**And** it displays the original plot boundary polygon with the actual recorded GPS flight path rendered as an overlay on top

### Story 4.4: Invoicing & UPI Payments

As an Estate Owner,
I want to pay my invoice directly through the app using UPI,
So that I don't have to deal with cash or manual bank transfers.

**Acceptance Criteria:**

**Given** a generated Coverage Report
**When** the user taps "Approve"
**Then** the system generates a GST-compliant digital invoice
**And** tapping "Pay Now" triggers a native UPI deep-link (e.g., GPay/PhonePe), updating the booking status upon successful webhook callback

### Story 4.5: Pilot Rating & Feedback System

As an Estate Owner,
I want to rate the pilot after the job is done,
So that high-quality pilots get prioritized for my future bookings.

**Acceptance Criteria:**

**Given** a completed payment
**When** the success screen is shown
**Then** a 1-5 star rating modal appears
**And** submitting a rating updates the pilot's aggregated lifetime rating score in the database

## Epic 5: Farm Intelligence & Proactive Insights (GeoAI)

**Goal:** Farm Managers can toggle advanced environmental layers (NDVI, weather, soil moisture) and receive automated AI crop stress recommendations to make targeted agronomic decisions.

### Story 5.1: External WMS Layer Toggling

As a Farm Manager,
I want to toggle between NDVI, Weather, and base Satellite layers on my map,
So that I can visually inspect the health of my crops and plan accordingly.

**Acceptance Criteria:**

**Given** the MapLibre view
**When** the layer FAB (Floating Action Button) is tapped
**Then** a menu of available data layers appears
**And** selecting NDVI or Weather fetches the external WMS/WMTS raster tiles (e.g., from Sentinel Hub) and overlays them on the map, displaying a distinct loading spinner in the UI until the MapLibre tile-loaded event fires

### Story 5.2: Scheduled NDVI Ingestion Pipeline

As a System Administrator,
I want the backend to automatically pull the latest NDVI data for all active plots nightly,
So that we build a historical dataset to power the crop stress risk engine.

**Acceptance Criteria:**

**Given** active plots in the database
**When** the nightly `pg_cron` schedule hits
**Then** the `crop-stress-predictor` Edge Function is invoked
**And** it fetches the latest NDVI values for each plot bounding box from the Sentinel Hub API (using a >80% Cloud Mask filter to skip obscured readings) and saves them to the `plot_ndvi_snapshots` table

### Story 5.3: AI Crop Stress Risk Engine

As a Farm Manager,
I want the system to automatically analyze my NDVI data trends,
So that I get warned mathematically if my crop health is failing, without having to manually check the map.

**Acceptance Criteria:**

**Given** a new NDVI snapshot is saved
**When** the Edge Function evaluates it
**Then** it compares the value against the 14-day rolling average
**And** if the drop exceeds the specific `crop_type` threshold, it writes a `high` or `critical` severity score to the `plot_risk_scores` table

### Story 5.4: Proactive "Book Spray" Push Notifications

As a Farm Manager,
I want to receive a push notification when my crop is at risk,
So that I can book a drone spot-spray immediately to save the yield.

**Acceptance Criteria:**

**Given** a new `critical` score inserted into `plot_risk_scores`
**When** the Supabase Realtime trigger fires
**Then** it sends a push notification to the assigned Farm Manager's device
**And** tapping the notification deep-links the user directly into the Booking Flow (Epic 3) with the affected plot pre-selected
