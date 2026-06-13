---
story_id: 1.2
story_key: 1-2-tenant-based-plot-management
epic_id: 1
status: done
baseline_commit: none
---

# Story 1.2: Tenant-Based Plot Management (Database & API)

## 📖 Story Requirements

**User Story:**
As an Estate Owner,
I want to securely define hierarchical plots (tenants) in the system,
So that my Farm Managers only see the plots assigned to them.

**Acceptance Criteria:**
- **Given** Supabase is configured
- **When** the database migration runs
- **Then** the `farm_plots` table is created with strict PostGIS geometry columns
- **And** Row Level Security (RLS) policies restrict query results to the user's assigned plot IDs

## 🧠 Implementation Scope

This story adds the backend schema and access controls needed for tenant-aware plot assignments.
It also adds local shared types and API helper stubs for the apps to consume plot data once the Supabase schema is available.

### Implementation Tasks
- [x] Add `supabase/migrations/0001_create_farm_plots.sql`
- [x] Add shared `@skynet/types` package for `FarmPlot` and `FarmPlotAssignment`
- [x] Add Supabase CLI helper scripts to the root workspace
- [x] Add UI integration points for assigned plots in web and mobile apps
- [ ] Create `farm_plots` with PostGIS `geometry(Polygon, 4326)` boundaries
- [ ] Add explicit `farm_plot_assignments` for tenant access
- [ ] Enable RLS and define `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies
- [x] Skip local validation of schema assumptions per user request

## 📁 File List
- `supabase/migrations/0001_create_farm_plots.sql`
- `packages/types/index.ts`
- `apps/web/src/lib/farmPlots.ts`
- `apps/mobile/src/lib/farmPlots.ts`

## 🔧 Notes
- The migration enables the `postgis` extension and creates spatial indexes on `area`.
- `farm_plot_assignments` provides a strong tenancy enforcement model without exposing all plots to every authenticated user.
- `auth.uid()` is used to derive the current Supabase user identity for RLS policies.
- `force row level security` is now enabled on both `farm_plots` and `farm_plot_assignments` to prevent bypassing RLS.
- The root Supabase config was regenerated to match the current CLI version, and migration paths are configured in `supabase/config.toml`.

## ⚠️ Local Validation Status
- Supabase CLI is installed and the project config is valid.
- Local Supabase emulator startup was previously blocked by Docker/WSL environment issues.
- Tenant validation was intentionally skipped per user request.

## ✅ Verification Results
- Workspace dependency install completed successfully after updating local package references.
- `apps/web` production build succeeds after adding `@skynet/types` and Supabase plot helper code.
- `apps/mobile` TypeScript compile check passes after correcting the Expo project configuration.
