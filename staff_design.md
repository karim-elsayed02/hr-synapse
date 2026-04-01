# Design System Strategy: The Digital Curator

## 1. Overview & Creative North Star
The North Star for this design system is **"The Digital Curator."** 

This system moves away from the generic "SaaS dashboard" aesthetic toward a high-end editorial experience. It is designed to feel authoritative yet accessible—combining the weight of a premium medical journal with the fluid interactivity of modern fintech. 

To achieve this, we break the "template" look through:
*   **Intentional Asymmetry:** Using varying card widths and staggered layouts to guide the eye, rather than a repetitive grid.
*   **High-Contrast Depth:** Dark, immersive headers and sidebars (`primary_container`) set against airy, expansive content areas.
*   **Textural Sophistication:** Moving beyond flat HEX codes to incorporate glassmorphism and light-bleed gradients that suggest physical depth and digital intelligence.

---

## 2. Colors
Our palette is rooted in a "Midnight & Amber" high-contrast pair, supported by a technical "Sky" gradient.

### Core Palette
*   **Primary (Midnight):** `#001A3D` (`on_primary_fixed`). Used for global navigation, headers, and sidebar containers to anchor the experience in professional stability.
*   **Secondary (Amber):** `#FFB84D` (`secondary_container`). Used for high-priority CTAs (Login, Start Learning) and critical data highlights.
*   **Tertiary (Sky/Teal):** `#4DB8FF` to teal gradient. Reserved for data visualizations, progress bars, and "active state" accents.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To separate content, designers must use background shifts or vertical whitespace. 
*   Place a `surface_container_lowest` card on a `surface` background.
*   Use `surface_container_low` for secondary groupings. 
The lack of 1px lines creates a modern, "seamless" look that feels curated rather than engineered.

### Signature Textures
Apply a subtle linear gradient to main CTAs and Hero sections. Transition from `primary` (`#000000`) to `primary_container` (`#011b3e`) at a 135-degree angle. This prevents large dark areas from feeling "dead" and adds a premium sheen visible in high-end automotive or medical hardware interfaces.

---

## 3. Typography
We utilize a dual-font system to balance technical precision with editorial elegance.

*   **Display & Headlines (Manrope):** Geometric and authoritative. Used for `display-lg` through `headline-sm`. Manrope’s wide apertures ensure legibility in high-density data environments.
*   **Body & Labels (Inter):** The workhorse. Used for `title-lg` down to `label-sm`. Inter is optimized for screen readability and provides a neutral, "lab-grade" clarity to complex medical data.

**Editorial Hierarchy Tip:** When displaying key metrics, pair a `display-md` value in Manrope with a `label-md` descriptor in Inter (all-caps, 0.05em tracking) to create a "Curated Stat" look.

---

## 4. Elevation & Depth
In "The Digital Curator" system, depth is a functional tool, not a stylistic flourish.

### The Layering Principle
Achieve hierarchy by "stacking" the surface-container tiers. 
1.  **Level 0 (Base):** `surface` (#f8f9fa).
2.  **Level 1 (Sectioning):** `surface_container_low` (#f3f4f5).
3.  **Level 2 (Interactive Cards):** `surface_container_lowest` (#ffffff).

### Glassmorphism & Ambient Shadows
*   **Floating Elements:** For tooltips or floating action menus, use a semi-transparent `surface` color with a `backdrop-blur: 12px`.
*   **Ambient Shadows:** Use extra-diffused shadows. 
    *   *Values:* `0px 8px 24px rgba(0, 26, 61, 0.06)`. 
    *   Note the shadow color is a tinted version of our `on_primary_fixed` midnight blue, not grey.
*   **The Ghost Border:** If a boundary is strictly required for accessibility, use `outline_variant` at **15% opacity**.

---

## 5. Components

### Buttons & Chips
*   **Primary CTA:** `secondary_container` (#FFB84D) background with `on_secondary_fixed` (#291800) text. Corner radius: `xl` (1.5rem/24px) for a "pill" look that stands out against rectangular cards.
*   **Tertiary/Filter Chips:** `surface_container_high` background. On hover, shift to `primary_fixed_dim`. No borders.

### Cards & Lists
*   **Anatomy:** Cards must use `rounded-lg` (1rem/16px). 
*   **Spacing:** Content within cards must adhere to the `spacing-6` (1.5rem) padding rule.
*   **Lists:** Forbid divider lines. Use `spacing-2` between list items and a subtle `surface_container` background-color shift on hover to indicate interactivity.

### Data Visualization (The Curator’s Tool)
*   **Progress Bars:** Use the Sky-to-Teal gradient for completion. 
*   **Status Indicators:** Use `secondary_fixed` for "In Progress" and `tertiary_fixed_dim` for "Complete."

---

## 6. Do's and Don'ts

### Do
*   **Do** use `on_secondary_container` (Amber) for "Hero" text within dark Midnight headers.
*   **Do** lean into white space. If a layout feels cluttered, increase the padding to the next step in the spacing scale (`spacing-10` or `12`).
*   **Do** use `surface_bright` for main content areas to maintain a "clean room" medical feel.

### Don't
*   **Don't** use 1px solid borders to separate sidebar items. Use font weight and subtle background-color shifts.
*   **Don't** use pure black (#000000) for shadows. Always tint shadows with the navy primary color to maintain tonal harmony.
*   **Don't** mix corner radii. If a card is `lg`, the internal buttons should not be `sm`. Use the `xl` pill shape for buttons to create a clear shape-language distinction between "Container" and "Action."

### Accessibility Note
Ensure all text on `secondary_container` (Amber) uses the `on_secondary_fixed` (Deep Brown/Black) token to maintain a high contrast ratio (WCAG AA+), as white text on gold often fails legibility standards.