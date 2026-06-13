---
status: final
updated: 2026-06-05
colors:
  primary: '#10B981' # Vibrant Leaf Green
  on-primary: '#FFFFFF'
  background: '#FAFAF9' # Warm Off-White
  on-background: '#121212'
  surface: '#FFFFFF'
  on-surface: '#121212'
  dark-background: '#292524' # Deep Soil Brown
  dark-surface: '#44403C' # Warm Earth Grey
  error: '#FF3B30' # High Viz Red/Orange for Hazards
  success: '#34C759'
typography:
  family-sans: '"Roboto", sans-serif'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
---

# Brand & Style

**The Agronomist**
Skynet Drone Services is a high-end, data-driven "Glass Cockpit" for precision agriculture. The visual identity focuses on the biology of the farm, feeling organic but modern. It should feel like a specialized tool for nurturing crops and maximizing yield.

# Colors

* **Vibrant Leaf Green (`{colors.primary}`)**: The core brand color, used for primary actions, GPS tracking lines, and active states. 
* **Deep Soil Brown (`{colors.dark-background}`)**: The default dark-mode background. Warm, organic, and grounded.
* **High-Viz Error (`{colors.error}`)**: Used specifically for hazard pins and emergency alerts. Must maintain high contrast in bright sunlight.

# Typography

We use the default M3 **Roboto** (`{typography.family-sans}`) to maintain a standard, familiar Android/Google feel while remaining highly legible.

# Shapes

We override the standard M3 "pill" shaped components. To reinforce the clinical, precision-tech vibe, we use a moderately rounded `8px` (`{rounded.md}`) corner for cards, bottom sheets, and standard buttons. This balances modern mobile ergonomics with the seriousness of an industrial tool.

# Components

## The Telescoping Bottom Sheet
The primary container for complex interactions (Booking, Telemetry). 
- **Corners**: Top-left and Top-right use `{rounded.lg}`.
- **Elevation**: Casts a heavy shadow in light mode, or uses a lighter `{colors.dark-surface}` elevation in dark mode to separate from the map.
- **Drag Handle**: A 4px thick, 32px wide pill at the top-center to afford dragging.

## Floating Action Buttons (FABs)
Used for Map Layer toggles.
- **Corners**: `{rounded.md}` (8px) rather than fully circular, creating a more "instrument panel" feel.
- **Size**: Oversized (56px minimum) to ensure glove-friendly tap targets.

# Do's and Don'ts

* **DO** use dark mode as the default for drone pilots to reduce glare in the field.
* **DO** ensure all text on the map has a slight semi-transparent backing or text-stroke to guarantee contrast against varying satellite tiles.
* **DON'T** use fully circular components unless absolutely necessary (e.g., a profile avatar). Stick to the 8px radius for UI elements.
* **DON'T** use low-contrast greys. Operators are outside in bright sunlight. Use stark whites or true blacks for typography.
