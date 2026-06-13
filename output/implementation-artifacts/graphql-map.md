# GraphQL Domain Map for Skynet Plot Management

This document captures the current plot and tenant model as a GraphQL-friendly schema for future API design.

## Domain Entities

### `GeoJSONPolygon`
A strict polygon geometry type used to represent plot boundaries.

```graphql
scalar DateTime

input GeoJSONPositionInput {
  longitude: Float!
  latitude: Float!
}

input GeoJSONPolygonInput {
  type: String! # always "Polygon"
  coordinates: [[GeoJSONPositionInput!]!]!
}

type GeoJSONPosition {
  longitude: Float!
  latitude: Float!
}

type GeoJSONPolygon {
  type: String!
  coordinates: [[GeoJSONPosition!]!]!
}
```

### `FarmPlot`
A tenant-aware plot entity with owner, manager, hierarchy, and boundary metadata.

```graphql
type FarmPlot {
  id: ID!
  ownerId: ID!
  managerId: ID
  parentPlotId: ID
  name: String!
  description: String
  area: GeoJSONPolygon
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### `FarmPlotAssignment`
Maps a user to a specific farm plot for access control.

```graphql
type FarmPlotAssignment {
  id: ID!
  plotId: ID!
  userId: ID!
  assignedAt: DateTime!
}
```

### `User`
Current user identity used for RLS-aware queries.

```graphql
type User {
  id: ID!
  email: String!
}
```

## Suggested Queries

```graphql
extend type Query {
  myAssignedFarmPlots: [FarmPlot!]!
  farmPlot(id: ID!): FarmPlot
  myPlotAssignments: [FarmPlotAssignment!]!
}
```

## Suggested Mutations

```graphql
extend type Mutation {
  signIn(email: String!, password: String!): AuthPayload!
}

type AuthPayload {
  accessToken: String!
  refreshToken: String!
  user: User!
}
```

## GraphQL Use Case Map

- `myAssignedFarmPlots` should return plots filtered by the current authenticated user.
- `farmPlot(id: ID!)` can be used for single plot detail retrieval.
- `myPlotAssignments` supports tenant assignment inspection and validation.
- `GeoJSONPolygon` is the canonical shape for boundary rendering.
- `area` should be returned as a strict polygon whenever possible; raw string fallback is acceptable for legacy storage.

## Current Code Base Mapping

- `packages/types/index.ts` defines the shared `FarmPlot`, `FarmPlotAssignment`, and `GeoJSONPolygon` types.
- `apps/web/src/lib/farmPlots.ts` and `apps/mobile/src/lib/farmPlots.ts` are the current data access layers.
- `apps/web/src/App.tsx` and `apps/mobile/app/page.tsx` are the current UI pages consuming plots and rendering boundary metadata.
- `apps/web/src/components/BoundaryMap.tsx` and `apps/mobile/src/components/BoundaryMap.tsx` provide lightweight boundary rendering stubs.

## Notes
- This is a conceptual GraphQL map for future implementation; the current code base is still using Supabase JS rather than a GraphQL API.
- The map is designed to support tenant-aware plot delivery, boundary rendering, and future offline caching.
