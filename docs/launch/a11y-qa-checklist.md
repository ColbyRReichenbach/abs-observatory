# Accessibility QA Checklist

## Keyboard
- [x] `Tab` order reaches nav, range selectors, cards, and copilot controls.
- [x] Skip link appears on focus and moves focus to main content.
- [x] Drawer open/close works via keyboard only.

## Focus + Contrast
- [x] `:focus-visible` ring appears clearly on interactive controls.
- [x] Live badges and status text maintain readable contrast.

## Motion
- [x] Reduced-motion mode removes or minimizes non-essential animation.
- [x] Core interactions remain understandable with reduced motion enabled.

## Screen Reader Semantics
- [x] Landmark structure is present (`main-content` target for skip link).
- [x] Important status labels are text-visible (not color-only).
- [x] Error/empty states expose clear retry action text.
