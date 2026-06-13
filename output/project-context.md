---
project_name: 'skynet'
user_name: 'terminator'
date: '2026-06-04'
sections_completed: ['technology_stack', 'architecture', 'prd']
existing_patterns_found: 0
architecture_status: 'complete'
prd_status: 'final'
current_phase: '3-implementation'
next_recommended_action: 'bmad-dev-story on 1-2-tenant-based-plot-management'
---

# Project Context for AI Agents

> **MANDATORY:** Before taking ANY action on this project, read the full project knowledge document at:
> `docs/project-knowledge.md`
>
> It contains all personas, architectural decisions, rejected approaches, naming rules, and roadmap tiers.

---

## Current Project State (for BMad Agents)

**Phase:** Implementation (Development)
**Status:** 
- PRD, Architecture, Epics, and UX Designs are **COMPLETE** and hardened.
- `sprint-status.yaml` has been generated and tracks execution.
- Story 1.2 (`1-2-tenant-based-plot-management.md`) has been extracted and is in `ready-for-dev` state.

**Next Required Action:**
Execute `bmad-dev-story` (using the Dev Agent, Amelia) targeting `output/implementation-artifacts/1-2-tenant-based-plot-management.md`.

---

## Technology Stack (Finalized — Do Not Change Without Approval)

- **Mobile App:** Expo (React Native) + Expo Router + MapLibre Native + TanStack Query v5 + AsyncStorage
- **Web Dashboard:** Vite + React + TypeScript + Mapbox GL JS + TanStack Query v5 + Zustand
- **Backend:** Supabase (PostgreSQL 15 + PostGIS + Auth + Edge Functions + Storage)
- **Shared Types:** `packages/types/` — auto-generated via `supabase gen types typescript`
- **Mobile CI/CD:** Expo EAS
- **Web CI/CD:** Vercel
- **Photogrammetry:** WebODM Lightning API (outsourced — no self-hosted ODM in Tier 1)

## Critical Implementation Rules

1. **Coordinates are ALWAYS `[longitude, latitude]`** — the GeoJSON order. Never swap.
2. **Supabase calls ALWAYS destructure `{ data, error }`** — never assume data without checking error.
3. **No CRDT engine** — offline sync uses TanStack Query + AsyncStorage event queue only.
4. **No custom tile server** — MapLibre offline packs handle device caching; PostGIS handles spatial queries.
5. **No CesiumJS or 3D libs in Tier 1** — deferred to Tier 2 (v1.5, months 6–12).
6. **External API secrets stay in `supabase/functions/`** — never in the mobile or web client.
7. **`apps/mobile` and `apps/web` never import from each other** — all shared code lives in `packages/`.
8. **All timestamps: UTC ISO-8601 strings** — no Unix timestamps, no local time.
