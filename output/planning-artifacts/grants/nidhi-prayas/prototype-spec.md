# Prototype Specification — PCVM Gen-1

## Overview
The Proof-of-Coverage Verification Module (PCVM) Gen-1 is a low-cost, rugged hardware logger that mounts on agricultural spray drones to capture geo-verified spray coverage evidence for farmers and FPOs.

## Objectives
- Produce tamper-evident flight logs (GPX/GeoJSON) aligned to farmer-supplied KMZ boundaries
- Support offline logging in low-connectivity rural environments
- Deliver a field-ready prototype validated across 10+ demo plots

## Physical Components (Gen-1 Scope)
- GNSS module: Multi-constellation GNSS (GPS + GLONASS); RTK optional for demo plots
- Microcontroller: ESP32 or STM32-class MCU with RTC and secure timestamping
- Storage: Non-volatile flash or SD for offline log retention
- Power: Regulated power tap from drone battery (with isolation) + optional backup pack
- Enclosure: IP54 rugged enclosure with universal mounting bracket
- Connectors: JST/SM connectors for power and data access

## BOM (example)
- GNSS module x4
- MCU dev boards x10
- Flash/SD module x4
- Enclosure (3D-printed prototypes) x10
- Mounting brackets x4
- Wiring harness, connectors, fasteners

## Firmware Requirements
- High-resolution timestamped GNSS track at configurable frequency (1–10 Hz)
- Tamper-evidence: append-only logs with simple hash chain per session
- KMZ alignment metadata capture (plot ID, owner ID)
- Export formats: GPX, GeoJSON, CSV
- Lightweight integrity verification routine for field acceptance tests

## Integration
- Mounting on 10L agricultural spray drone frames
- Bench and tethered tests for vibration and EMI resilience
- Simple LED/state indicator for recording status

## Acceptance Criteria
- GPS track recorded for full pilot run without data loss
- Exported coverage report includes coverage % vs KMZ boundary
- Offline log integrity verified via hash chain sample
- Enclosure withstands field conditions for minimum 10 sorties without failure

## Test Plan
1. Lab QA: power cycling, thermal, vibration soak
2. Bench GPS repeatability: 5 runs, CE95 target ≤ 3m (standalone)
3. Integration bench: mount on drone, power tap validation
4. Field trials: 10 fields across 3 crop types; manual audit vs PCVM coverage
5. User acceptance: ≥20 farmer/pilot feedback sessions

## Data & Privacy
- Logs stored locally until secure sync
- Farmer consent template must be collected before data retention

## Out-of-Scope (Gen-1)
- Inline chemical flow sensing
- Commercial telemetry/wireless real-time streaming

## Next Steps
- Finalize BOM and procurement list
- Allocate PRAYAS Shala prototyping time
- Draft firmware sprint plan and assign owners
