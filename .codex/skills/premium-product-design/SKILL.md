---
name: premium-product-design
description: Use when designing, redesigning, or polishing frontend UI, UX flows, product screens, onboarding, visual systems, components, landing sections, or app surfaces that should feel premium, refined, clear, and emotionally polished.
---

# Premium Product Design

Use this before meaningful frontend UI/UX design or polish work.

## Design Posture

- Build the actual product surface first, not a marketing wrapper.
- Make the interface feel inevitable: fewer elements, clearer hierarchy, no decorative noise.
- Prefer calm confidence: generous spacing, crisp typography, precise alignment, high-quality empty/loading/error states.
- Every screen needs one primary user intention. Everything else supports or gets quieter.

## Visual Quality Checklist

1. **Hierarchy**
   - One dominant focal point.
   - Supporting copy is smaller, calmer, and shorter.
   - Buttons have obvious priority: primary, secondary, disabled.
2. **Layout**
   - Use a clear grid and repeat spacing rhythm.
   - Avoid cards inside cards.
   - Avoid random centered stacks when a workflow needs scanning.
3. **Typography**
   - No viewport-scaled body text.
   - No negative letter spacing.
   - Headings must fit their container on mobile and desktop.
4. **Color**
   - Use restrained contrast and a small accent palette.
   - Avoid one-note purple/blue/dark-slate/cream themes unless the brand requires it.
   - Use color to clarify state, not to decorate.
5. **Material**
   - Prefer subtle borders, shadows, translucency, and surface depth only when they explain layering.
   - Keep border radius at 8px or less unless the existing design system says otherwise.
6. **Content**
   - Write human microcopy in the product’s language.
   - Do not expose raw backend or technical errors.
   - Empty states must give a next action.

## UX Flow Rules

- Do not show final/result screens before the result exists.
- Loading states must map to real work, not fake timers.
- Preserve state during internal transitions; avoid full-screen loaders after bootstrap.
- If a step fails, keep the user near the next useful action.

## Implementation Rules

- Reuse existing components/classes before creating new visual systems.
- Use icons for compact tool actions when available.
- Use native controls where they improve clarity, but style them as part of the product.
- After changes, verify rendered UI in a visible browser when possible.

## Final Design Pass

Before calling UI work finished, check:

- first viewport communicates the current task;
- no text overlaps, clips, or wraps awkwardly;
- mobile layout keeps controls reachable;
- loading/error/empty states are designed, not dumped;
- the screen feels like one coherent product, not assembled parts.
