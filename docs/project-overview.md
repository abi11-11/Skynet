# skynet - Project Overview

**Date:** 2026-05-26  
**Type:** Planning workspace (target: mobile + backend platform)  
**Architecture:** Tenant-hierarchy geospatial marketplace (planned)

## Executive Summary

**Skynet** is a drone-as-a-service (DaaS) platform for Tamil Nadu agriculture, currently in the **pre-implementation planning phase**. The repository holds BMAD Method artifacts — PRD, market research, brainstorming outputs, and design scaffolding — but **no application source code** yet.

The product vision is a **map-first, offline-capable mobile platform** connecting estate owners, farm managers, and smallholder farmers with DGCA-certified drone pilots for precision spraying, surveying, and related services. A **tenant hierarchy** separates estate-level aggregate views (parent tenant) from plot-level operational booking (child tenant).

## Project Classification

- **Repository Type:** Monolith (BMAD planning workspace)
- **Implementation Status:** Pre-implementation — planning and analysis only
- **Target Project Type(s):** Mobile (farmer/manager app, pilot app) + Backend (dispatch, booking, payments)
- **Primary Language(s):** Not selected (implementation pending)
- **Architecture Pattern:** Multi-tenant geospatial marketplace with offline-first mobile clients

## Technology Stack Summary

| Category | Current (Repository) | Target (From PRD) |
|----------|---------------------|-------------------|
| Planning tooling | BMAD Method 6.8.0 | — |
| Scripting | Python 3.12 (`_bmad/scripts/`) | — |
| Mobile app | — | Map-first, offline-first (TBD: Flutter/React Native) |
| Backend | — | Booking, dispatch, payments (TBD) |
| Geospatial | — | KML/KMZ, NDVI layers, map tile caching |
| Database | — | TBD |
| Payments | — | UPI (PhonePe, GPay), GST invoicing |
| Auth / tenancy | — | Parent/child tenant hierarchy |

## Key Features (From PRD)

1. **Geospatial & hierarchy engine** — KML/KMZ ingestion, tenant hierarchy, map layer toggling, offline map caching, hazard pins
2. **Booking & dispatch** — Contextual service recommendations, automated cost calculation, telephony helpline, pilot routing
3. **Proof-of-service** — GPS track recording, coverage reports, geo-tagged media, UPI payments, pilot ratings
4. **Accessibility** — Sunlight/glove-readable UI; telephony helpline for smallholders (Tamil voice UI deferred per decision log)

## Architecture Highlights

- **B2B2C marketplace aggregator** targeting farmers via FPOs and Custom Hiring Centers
- **Parent tenant** = view-only aggregate dashboards for estate owners
- **Child tenant** = operational level where booking is enabled
- **Offline-first** sync for rural connectivity gaps
- **Government land registry integration** planned for boundary validation

## Development Overview

### Prerequisites (Current Workspace)

- Python 3.12+ (for BMAD customization scripts)
- Cursor / AI agent environment with BMAD skills installed (`.agents/skills/`)

### Getting Started

This repository is used for **BMAD Method planning workflows**, not running an application yet. See [development-guide.md](./development-guide.md) for agent and workflow commands.

### Key Commands

- **Resolve skill config:** `python3 _bmad/scripts/resolve_customization.py --skill <path> --key workflow`
- **Generate project context:** invoke `bmad-generate-project-context` skill
- **Document project:** invoke `bmad-document-project` skill (this scan)

## Repository Structure

```
skynet/
├── _bmad/              # BMAD Method core config, scripts, modules
├── .agents/skills/     # Agent skills (Paige, PRD, architecture, etc.)
├── output/             # Planning artifacts (PRD, research, brainstorming)
├── design-artifacts/   # WDS design workflow folders (scaffolding)
├── docs/               # Generated project documentation (this scan)
└── output/project-context.md  # AI agent rules (stub, in progress)
```

## Documentation Map

- [index.md](./index.md) — Master documentation index
- [architecture.md](./architecture.md) — Target platform architecture (from PRD)
- [source-tree-analysis.md](./source-tree-analysis.md) — Directory structure
- [development-guide.md](./development-guide.md) — BMAD workspace development

---

_Generated using BMAD Method `document-project` workflow_
