---
name: motion-interaction-design
description: Use when adding, reviewing, or polishing UI animations, transitions, loading motion, gestures, microinteractions, page transitions, CSS animations, Framer Motion-style choreography, or any frontend motion system.
---

# Motion Interaction Design

Use this before adding animation or motion to frontend UI.

## Motion Philosophy

- Motion explains change. It is not decoration.
- Good animation feels responsive, quiet, and physically coherent.
- Prefer a few meaningful transitions over many busy effects.
- Animation should make the product feel more expensive, not more distracted.

## Timing Guidelines

- Microinteraction: 120-180ms.
- Button/hover/focus feedback: 100-160ms.
- Modal/sheet/card entrance: 180-280ms.
- Page/step transition: 240-420ms.
- Loading loop: slow enough to breathe, never frantic.

## Easing Guidelines

- Use ease-out for entrances.
- Use ease-in for exits.
- Use ease-in-out for movement between stable states.
- Prefer spring only when motion implies physical continuity.
- Avoid bounce unless the product is explicitly playful.

## Choreography

1. Animate parent surface first.
2. Then content.
3. Then secondary details.
4. Stagger lightly: 30-70ms between related items.
5. Keep related elements moving in the same direction.

## What To Animate

- Step changes in onboarding/wizards.
- Photo upload preview replacement.
- Generation waiting state.
- Success/result reveal.
- Button press, disabled/enabled transitions.
- Error appearance and retry affordances.

## What Not To Animate

- Text reflow that causes layout jumps.
- Critical form submission in a way that delays feedback.
- Every hover state on dense operational screens.
- Background blobs, random orbs, or decorative shimmer with no meaning.

## CSS/React Implementation

- Prefer CSS transitions for simple opacity/transform/color.
- Prefer `transform` and `opacity`; avoid animating layout properties when possible.
- Use stable dimensions to prevent layout shift.
- Keep animation classes small and composable.
- Do not introduce a motion library unless it removes real complexity or already exists in the project.

## Accessibility And Performance

- Respect `prefers-reduced-motion`.
- Provide non-motion state changes for essential information.
- Keep animations GPU-friendly.
- Avoid long-running effects on many DOM nodes.
- Check mobile performance and text readability after motion.

## Verification

Before calling motion done:

- interaction still works with reduced motion;
- no flicker on initial load;
- no layout shift when content appears;
- repeated actions do not queue broken animations;
- the animation clarifies the state transition in one glance.
