---
status: final
updated: 2026-06-05
---

# Foundation
- **Form-Factor:** Mobile-First (iOS & Android via Expo) for Pilots and Farm Managers. Tablet/Web for Estate Owners (Tier 2).
- **UI System:** Google Material 3 (M3). `DESIGN.md` tokens override the visual presentation; this document specifies only the behavioral delta from standard M3.
- **Paradigm:** The "Glass Cockpit". The map is the primary, persistent navigational anchor.

# Information Architecture

1. **Map Surface (Core View)**
   - The default screen on app launch. Shows the user's GPS location and field boundaries.
   - Contains FABs (Floating Action Buttons) for Layer Toggling (Satellite, NDVI) and Recenter GPS.
2. **The "Telescoping" Bottom Sheet**
   - Rests horizontally across the bottom. 
   - Acts as the primary interaction surface for viewing Plot Details, booking Drone Services, and seeing Pilot Telemetry.
3. **Estate Dashboard (Drawer/Menu)**
   - Accessed via a hamburger menu or top-bar profile icon.
   - Summarizes overall farm health, total acreage, and billing history.

# Voice and Tone
- **Clinical, Precise, Proactive.**
- We do not say: "Hey there! Looks like your field is a bit thirsty!"
- We say: "Moisture deficit detected in Plot 3. Book targeted irrigation?"

# Component Patterns

## The Draggable Bottom Sheet (Booking Flow)
As requested, we implement a multi-detent draggable bottom sheet.
- **State 1 (Hidden/Peek):** Only the title of the selected plot and a primary "Action" button are visible.
- **State 2 (Half-Screen 50%):** Snaps to the middle of the screen. Shows the Chemical Calculator and Pricing table. The map remains visible and interactable in the upper half, providing spatial context.
- **State 3 (Full-Screen 100%):** Swiping up heavily snaps the sheet to full screen. This mode is used when complex forms (e.g., adding billing details, selecting specific chemical mixtures, or viewing long lists of fields) require maximum vertical real estate.

## Offline Sync Indicator
- Located in the top App Bar.
- **Online:** Hidden or shows a subtle green check.
- **Offline Mode:** Turns highly visible (Yellow/Amber). Reading says "Offline: Changes queued".

# State Patterns

- **Empty State (No Plots):** The map defaults to the user's GPS location. A massive, pulsing FAB prompts the user to "Draw First Boundary" or "Import KMZ".
- **Unflyable Error State:** If Turfs.js determines a plot is entirely covered by hazard buffers, the "Book Spray" button in the bottom sheet turns disabled/grey. A red `{colors.error}` banner explains: "Plot too hazardous for automated flight. Review hazard pins."

# Interaction Primitives
- **Pinch-to-Zoom:** Standard map behavior.
- **Long Press on Map:** Triggers the "Drop Hazard Pin" workflow.
- **Swipe Down:** Dismisses the Draggable Bottom Sheet back to the Peek state.

# Accessibility Floor
- **Sunlight Readability:** High contrast ratios enforced (WCAG AAA for text over map components).
- **Glove Mode:** All primary interactive elements (FABs, Booking buttons, List items) must have a minimum hit area of 56x56 dp.

# Key Flows

## Journey: The Farm Manager Books a Spray
*Protagonist: Arjun, Farm Manager for a 50-acre subdivided estate.*

1. **The Alert:** Arjun opens the app. The map centers on his estate. He notices Plot 3 is glowing orange (NDVI stress).
2. **The Tap:** He taps Plot 3. The Bottom Sheet slides up to the **Half-Screen (50%)** state. It confirms the NDVI alert and proactively shows: "Estimated Cost for Spot Spray: ₹2,400".
3. **The Calculation:** Arjun needs to adjust the chemical mix. He swipes the Bottom Sheet up to the **Full-Screen (100%)** state. The map disappears, giving him a clean form to input his exact chemical ratios and select a date.
4. **The Confirmation:** He hits "Confirm Booking". The sheet slides back down, revealing the map again. Plot 3 now has a "Pending Drone Dispatch" badge on it.
