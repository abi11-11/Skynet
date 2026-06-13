---
story_id: 1.4
story_key: 1-4-proactive-map-caching-offline-mode
epic_id: 1
status: done
baseline_commit: NO_VCS
---

# Story 1.4: Proactive Map Caching and Offline Mode

## 📖 Story Requirements

**User Story:**
As a Field Manager,
I want map boundaries and assigned plot metadata to be cached locally,
So that I can view my plot boundaries even when the device is offline.

**Acceptance Criteria:**
- **Given** the user has loaded assigned farm plots at least once
- **When** the device loses network connectivity
- **Then** the last-loaded plot boundary data remains visible in the app
- **And** the boundary metadata is stored securely for offline read access

## 🧠 Implementation Scope

This story will add a lightweight offline caching layer for boundary data in the mobile and web clients.
A shared cache contract should be added for plot geometry and assignment metadata, with secure persistence on mobile.

### Implementation Tasks
- [x] Define cache contract for plotted farm boundary payloads
- [x] Persist assigned plot metadata locally in mobile secure storage or local storage on web
- [x] Load cached boundary metadata when network is unavailable
- [x] Surface offline mode state in the mobile UI

### Review Findings
- [x] [Review][Patch] Unsafe JSON.parse casting: Validate `cached` is an array before returning, otherwise return null to prevent downstream runtime errors. [`apps/mobile/src/lib/cache.ts:16`]
- [x] [Review][Patch] Unsafe JSON.parse casting: Validate `cached` is an array before returning, otherwise return null. [`apps/web/src/lib/cache.ts:15`]
- [x] [Review][Defer] QuotaExceededError not handled: `localStorage.setItem` can throw if storage is full. Caught but no eviction logic implemented. [`apps/web/src/lib/cache.ts:6`] — deferred, pre-existing

## 📁 File List
- `apps/mobile/src/lib/cache.ts`
- `apps/mobile/app/page.tsx`
- `apps/web/src/lib/cache.ts`
- `apps/web/src/App.tsx`

## 🔧 Notes
- This story is intentionally lightweight: it focuses on caching plot boundary metadata, not full map tiles.
- Offline mode can be simulated by toggling network connectivity in the browser or mobile device.

## ✅ Pre-Story 1.4 Validation
- `apps/web` production build passes.
- `apps/mobile` TypeScript compile check passes.
- Shared GeoJSON and plot boundary stubs are implemented.
- Local Supabase runtime validation is still pending because the Docker/WSL environment is not configured in this workspace.

## ✅ Readiness
- Story artifact created and marked ready for development.
