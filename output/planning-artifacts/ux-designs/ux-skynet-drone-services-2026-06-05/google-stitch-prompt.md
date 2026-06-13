# Google Stitch UI Generation Prompt

*Instructions: Copy the text below the line and paste it directly into Google Stitch (https://stitch.withgoogle.com) or v0.dev to generate your UI demos.*

---

**Role:** You are an expert UX/UI Engineer specializing in React and Tailwind CSS.

**Task:** Build an interactive HTML/React prototype for "Skynet Drone Services", a mobile-first, high-end "Glass Cockpit" application for agricultural drone operators.

### 1. Visual Identity & Foundation (DESIGN.md)
*   **Foundation:** Base the design on Google Material 3 (M3) principles, with specific overrides to make it feel like an organic, modern ag-tech application focusing on growth and nurturing crops.
*   **Typography:** Use `Roboto` for all text, maintaining the standard Android/Google look.
*   **Corner Radius:** Override standard M3 pill shapes. Use moderately rounded `8px` (`rounded-md` in Tailwind) corners for cards, bottom sheets, and standard buttons to balance the organic feel with industrial utility.
*   **Colors:**
    *   Primary: Vibrant Leaf Green (`#10B981`)
    *   Background (Dark Mode Default): Deep Soil Brown (`#292524`)
    *   Surface (Cards/Sheets): Warm Earth Grey (`#44403C`)
    *   Error/Hazards: High-Viz Red/Orange (`#FF3B30`)
*   **Theme:** Force Dark Mode by default (Deep Soil Brown). Text should be a warm off-white (`#FAFAF9`) for high contrast in bright sunlight.

### 2. Interaction Patterns & IA (EXPERIENCE.md)
*   **The Glass Cockpit:** The background of the app is ALWAYS a map (use a placeholder dark-satellite map image or standard map component). The user never leaves the map context.
*   **The Draggable Bottom Sheet:** All complex actions happen in a bottom sheet that slides up over the map.
*   **FABs:** Oversized (min 56px) floating action buttons on the right side of the map for toggling layers (Satellite, NDVI).

### 3. Required Screens / States to Generate

Please generate a prototype that allows toggling between these 3 specific states:

**State 1: Map Surface (Core View)**
*   A full-screen dark satellite map background.
*   Top App Bar: Contains a hamburger menu icon, the title "Skynet", and a yellow/amber offline indicator badge that says "Offline: Changes queued".
*   Map content: A highlighted polygon representing "Plot 3 (Sugarcane)" glowing with a subtle orange border (indicating crop stress).
*   Right side: Two oversized FABs (one for GPS recenter, one for Layer Toggle).

**State 2: The "Half-Screen" Bottom Sheet (50%)**
*   Same map background, but a Bottom Sheet has slid up to cover exactly the bottom 50% of the screen.
*   The sheet has an 8px top-left/top-right border radius and a 4px drag handle pill at the top.
*   Sheet Content: A title "Plot 3 - Sugarcane", an alert badge "Moisture Deficit Detected", and a proactive calculation: "Estimated Spot Spray Cost: ₹2,400".
*   A large, full-width Electric Azure primary button: "Configure Spray".

**State 3: The "Full-Screen" Bottom Sheet (100%)**
*   The Bottom Sheet is now dragged all the way to the top, covering the map entirely.
*   Sheet Content: A complex configuration form.
    *   Input field: Chemical Mix Ratio (L/Acre).
    *   Dropdown: Select Drone Pilot.
    *   Date picker.
    *   A massive "Confirm Booking" button at the bottom.

**Output:** Please generate a single, functional React file (using Tailwind CSS and Lucide icons) that allows me to click through these three states using interactive buttons. Ensure the design feels organic, modern, and highly polished for field work.
