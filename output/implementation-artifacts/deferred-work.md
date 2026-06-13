# Deferred Work

## Deferred from: code review of 1-4-proactive-map-caching-offline-mode (2026-06-12)
- QuotaExceededError not handled: `localStorage.setItem` can throw if storage is full. Caught but no eviction logic implemented. [`apps/web/src/lib/cache.ts:6`]
