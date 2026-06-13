---
title: Skynet Drone Services Platform PRD
status: final
created: 2026-05-24
updated: 2026-06-04
---
## 1. Target Personas

### Primary Personas

**Persona A: The Estate Owner / Investor**
* **Profile:** Owns large or multiple non-contiguous tracts of land. Often manages the farm as a business from a remote office.
* **Core Needs:** High-level, aggregate dashboards showing overall farm health, total acres sprayed, and financial spend. Needs a "Telescope View" (traffic-light color coding) without getting bogged down in individual plot logistics.

**Persona B: The Farm Manager / Caretaker (Primary Operator)**
* **Profile:** Boots on the ground. Manages day-to-day operations across subdivided plots.
* **Core Needs:** A Map-First interface where the physical field is the primary navigation button. Needs large touch targets (sunlight/glove readable) and task-oriented proactive prompts (e.g., "High weed density detected. Book spray?").

**Persona C: The DGCA Drone Pilot (Supply Side)**
* **Profile:** Receives the job, travels to the location, and executes the spray or survey.
* **Core Needs:** Clear field boundaries (KMZ data), automated obstacle warnings (trees, poles), and a bulletproof offline-first sync mechanism for rural areas.

### Secondary Personas

**Persona D: The Smallholder / FPO Member**
* **Profile:** Owns 1-5 acres. Operates locally in Tamil Nadu.
* **Core Needs:** Simple, fast access to book a spray service using app interface without needing complex hierarchical map views.

---

## 2. Key User Journeys

### Journey 1: The "Map-to-Action" Booking Flow (Farm Manager)

This journey defines how a Farm Manager navigates from high-level farm overview down to booking a specific drone service, utilizing a telescoping, map-first interface.

1. **The "Estate" Dashboard (High-Level View):** The user opens the app to a Map-First Interface showing their total land boundary. The map uses traffic-light color coding based on recent satellite/NDVI data.
2. **Telescoping to the "Plot":** The user taps a "Red" (needs attention) zone. The app zooms smoothly into that specific subdivision (e.g., "Plot 3 - Sugarcane"). A bottom-sheet menu appears showing localized weather and the specific health alert.
3. **Visual Layer Toggling:** Using a floating action button, the user toggles the map view from *Satellite* to *NDVI (Plant Health)* to *Historical Yield*.
4. **Task-Oriented Booking:** Right on the plot card, a primary action button proactively suggests a solution: **"Book Precision Spot-Spraying for Plot 3"**.
5. **Offline-First Execution:** The user confirms the booking. The app auto-attaches the KMZ boundaries and chemical requirements, caches the request if offline, and syncs automatically when a signal is found, dispatching to a DGCA pilot.

---

## 3. Features & Capabilities

### 3.1 Geospatial & Hierarchy Engine

**FR-1.1: Land Boundary Ingestion & Integration**
* The system must allow field boundaries to be defined via:
  1. **Direct Upload:** Import of official KML/KMZ or Shapefiles.
  2. **Government Integration:** Direct API integration with government land registry data (where available) to pull official boundaries.
  3. **Mapping Service Booking:** Users can book a "Drone Mapping Service" directly through the app to generate official 3D boundaries and export them as authorized documents.
  4. **Draw & Snap (AI):** The user draws a rough polygon on the mobile map, and AI edge-detection snaps the boundary exactly to visible crop lines.

**FR-1.2: Tenant-Based Hierarchical Plot Management**
* The system must implement a **Tenant Hierarchy Architecture**:
  * **Parent Tenant (Estate/Owner Level):** Has "View Only" access to aggregate data across all child tenants. Cannot book services directly from this view to prevent accidental bulk bookings.
  * **Child Tenant (Plot/Manager Level):** The operational level where specific field data is accessed and where booking drone services is enabled.
* Users must be able to group child tenants dynamically (e.g., grouping all "Sugarcane" plots together) to view aggregate crop-specific data.

**FR-1.3: Visual Layer Toggling**
* The map interface must allow users to toggle between distinct data layers:
  * *Base Layer:* High-resolution satellite view.
  * *Health Layer:* Color-coded NDVI (Normalized Difference Vegetation Index) maps.
  * *Weather Layer:* Live radar and wind-direction overlay.
  * *Soil Moisture Layer:* Visualizing dry/wet zones for irrigation planning.
  * *Topographic/Elevation Layer:* Visualizing slopes and water drainage patterns (generated from 3D mapping surveys).
  * *Pest/Disease Heatmap:* AI-generated probability zones based on recent spray data and crop type.

**FR-1.4: Proactive Map Caching (Offline Mode)**
* The system must automatically download and cache the map tiles and boundary data for the user's saved plots onto their local device storage.
* The map must be fully viewable and interactable without an internet connection.

**FR-1.5: Ground-Truthing & Hazard Annotation**
* Users must be able to drop pins on the map to log hazards (e.g., "Tall Tree", "Power Line") or validate satellite crop stress alerts (e.g., "Pest sighting", "Dry soil").
* Users can attach geotagged photos to these pins directly from their phone.
* Hazard pins are automatically transmitted to the Drone Pilot's flight controller to prevent crashes, while crop stress pins act as exact GPS coordinates for localized spot-spraying.

**FR-1.6: External GIS Data Ingestion**
* The map interface must support rendering external WMS/WMTS satellite data layers (e.g., from Sentinel or partner platforms like AgriTwin).
* This allows the platform to offer advanced remote-sensing indices (NDMI, NDRE, EVI) to trigger drone flights without requiring our drones to fly expensive multispectral cameras in Tier 1.

### 3.2 Booking & Dispatch Engine

**FR-2.1: Comprehensive Services Menu & Contextual Recommendations**
* When a user selects a specific plot on the map, the system must display a full list of all available drone services.
* **Proactive Notifications:** The system analyzes crop type, weather, and map data (e.g., NDVI) to push non-intrusive notifications directly on the map (e.g., "Warning: Stress detected in Plot A").
* **Dedicated Services Page:** The app must include a dedicated page listing all services offered by Skynet, which intelligently integrates and highlights the proactive service recommendations based on the user's specific farm data.

**FR-2.2: Automated Requirement & Cost Calculation**
* Once a service (e.g., spraying) is selected, the system uses the exact plot acreage (from FR-1.1) to automatically calculate the precise amount of chemical/fertilizer required and provides an exact, transparent cost quote for the drone flight.

**FR-2.3: Telephony Helpline Integration**
* The app must prominently feature a direct Helpline button. For farmers unable or unwilling to use the digital booking flow, tapping the button connects them to a Skynet customer support agent who can manually book the service on their behalf in the backend.

**FR-2.4: Pilot Dispatch & Routing Engine**
* Once a booking is confirmed, the algorithmic dispatch engine assigns the job to the nearest available, DGCA-certified pilot equipped with the correct hardware (e.g., 10L vs. 16L spray tank).
* The system optimizes the pilot's daily route if multiple jobs are clustered in the same village or estate.

### 3.3 Proof-of-Service Engine (Trust & Payments)

**FR-3.1: Real-Time GPS Track Recording**
* During the flight, the Pilot App must automatically record the exact GPS telemetry track of the drone.

**FR-3.2: Automated Coverage Reports**
* Immediately post-flight, the system must generate a visual "Coverage Report" showing the farmer's field boundary with the drone's actual flight path overlaid, proving 100% coverage.

**FR-3.3: Geo-tagged Media Evidence**
* The Pilot App must require the pilot to take a geo-tagged photo of the chemical mix being loaded, and an "After" photo of the completed field. These must be automatically attached to the Coverage Report.

**FR-3.4: Payments & Invoicing**
* Upon generation and user approval of the Coverage Report, the system triggers the invoice.
* Must integrate with standard UPI gateways (PhonePe, GPay) and generate a GST-compliant digital receipt.

**FR-3.5: Pilot Rating & Feedback System**
* After service completion, the user is prompted to rate the pilot (1-5 stars) and leave feedback. High-rated pilots receive priority dispatching for future local jobs.

## 4. Capability Tiers & Roadmap

To ensure rapid time-to-market while building a foundation for advanced surveying, the platform capabilities are tiered. The architecture must support this progression without requiring rip-and-replace rewrites.

| Capability | Tier 1 (MVP: Months 0-6) | Tier 2 (v1.5: Months 6-12) | Tier 3 (v2.0+) |
|---|---|---|---|
| **Imaging & Output** | Orthomosaic (2D), NDVI | DEM/DSM, 3D Mesh | Topographic Surveys (cm-accuracy) |
| **Sensor Required** | RGB camera (Drone) + External Satellite | RGB camera | LiDAR (.laz) |
| **Processing Engine** | OpenDroneMap (ODM) | OpenDroneMap (Extended) | PDAL/LAStools (New Pipeline) |
| **Mobile Visualization**| 2D tiles, NDVI & Satellite overlays | Hillshade / Elevation colormap | Simplified contour view |
| **Web Dashboard** | None (Mobile-first) | Full 3D mesh viewer | Full point cloud inspector |
| **Primary Persona** | Farm Manager, Pilot, Smallholder | Estate Owner, FPO | Infrastructure / Gov |

## 5. Technical Constraints & Non-Functional Requirements (NFRs)

### 5.1 System Architecture & Processing
* **Async Processing Pipeline:** The backend processing for drone imagery must be strictly asynchronous and event-driven (e.g., Queue → ODM → COG → TiTiler). This ensures the architecture can handle long-running photogrammetry jobs and provides a clean seam for future LiDAR processing plugins.
* **Storage Scalability:** Must utilize scalable object storage (e.g., AWS S3) to handle gigabytes of imagery per flight.

### 5.2 Offline Sync & State Resolution
* **Conflict Resolution:** The mobile application must implement a robust local-first database with CRDTs (Conflict-free Replicated Data Types) to handle dual-offline edits (e.g., Farm Manager drops a hazard pin offline while Pilot updates flight status offline).
* **High-Bandwidth Ingestion:** The Pilot app must support resumable, chunked local ingest (via USB-C OTG or local Wi-Fi from the drone controller) and background cloud syncing to mitigate rural connectivity drops.

### 5.3 Reliability, Safety, & Compliance
* **Telemetry Integrity:** GPS track recording must have a minimum sampling rate (≥1Hz) and explicit error handling if telemetry connection drops mid-flight.
* **Hazard Acknowledgment:** The Pilot app must cryptographically confirm receipt of all hazard pins before the "begin flight" action is unlocked in the software.
* **Data Residency & Payments:** Geospatial data must comply with Indian data residency laws (DPDP Act), and the UPI/Invoicing gateway must be PCI-DSS compliant.
* **Hardware Contracts:** Strict definitions for transmitting boundary polygons (KMZ) and hazard pins to DJI/custom flight controllers via MAVLink or proprietary SDKs.
