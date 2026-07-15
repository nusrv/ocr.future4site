<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Future OCR
description: A calm bilingual workspace for dependable document OCR.
---

# Design System: Future OCR

## 1. Overview

**Creative North Star: "The Translation Desk"**

A bright, orderly working surface inspired by a specialist's document desk: clear source material, precise annotations, and dependable tools kept within reach. The product is professional, calm, and trustworthy, with restrained motion used only to confirm state changes.

The interface must not resemble generic AI-tool marketing, a dense hosting panel, or a casual file converter. Subscriber workflows lead with the document and its status. Administrative screens favor evidence, auditability, and safe actions over decorative metrics.

**Key Characteristics:**

- Restrained color with one quiet indigo anchor
- Single humanist sans direction for Arabic and Latin UI
- Flat surfaces separated by spacing and tonal contrast
- Equal-quality left-to-right and right-to-left layouts
- Compact, explicit processing states

## 2. Colors

Use a restrained palette built around the generated violet-indigo seed, with a true white application background, near-black ink, and a distinct teal status accent. Exact tokens will be resolved during implementation in OKLCH.

**The Ten Percent Rule.** Indigo is reserved for primary actions, focus, and current selection and must occupy no more than ten percent of a working screen.

## 3. Typography

Use a single humanist sans family with strong Arabic and Latin coverage. Choose the final family during implementation and keep labels, data, headings, and body copy within one coherent family.

Hierarchy is compact and fixed rather than fluid. Body prose is limited to 65–75 characters per line. Tabular identifiers and hashes may use a compatible monospace face.

**The Equal Scripts Rule.** Arabic and Latin must have equivalent weight, hierarchy, legibility, and control sizing.

## 4. Elevation

The system is flat by default. Depth comes from tonal layers, dividers, and temporary overlays. Shadows are reserved for menus, dialogs, and elements actively lifted by interaction.

**The State Earns Depth Rule.** Resting content does not float; elevation communicates an active layer.

## 5. Components

Components use familiar product conventions, modest corner radii, direct verb-and-object labels, visible focus, and complete default, hover, focus, active, disabled, loading, and error states. Tables collapse into structured lists on narrow screens. Long-running jobs use skeletons and live status announcements rather than decorative spinners.

## 6. Do's and Don'ts

### Do:

- **Do** keep upload limits, retention, and billable-page behavior beside the upload control.
- **Do** use explicit labels such as “Upload document”, “Cancel job”, and “Delete source”.
- **Do** mirror layout direction while preserving correct direction for hashes, code, and mixed-language OCR text.
- **Do** teach the first action in empty states.

### Don't:

- **Don't** use generic AI-tool marketing with purple gradients, glowing effects, or exaggerated claims.
- **Don't** reproduce dense hosting panels that expose implementation details before users need them.
- **Don't** imitate consumer upload tools with unclear retention, privacy, or processing status.
- **Don't** fill dashboards with decorative, low-value metric cards.
- **Don't** use glassmorphism, gradient text, oversized rounded cards, or decorative motion.
