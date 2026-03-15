# Plan: Dark/Light Mode for Bee Studio

## Overview
Add a beautiful, modern dark/light theme toggle to the entire application. Dark mode uses a rich slate-navy palette with subtle blue-tinted glow effects, glass-morphism cards, and smooth transitions. All text, images, and UI elements remain fully visible and readable in both modes.

## Strategy: Global CSS Overrides + Tailwind `dark:` class

### Why this approach
- **118 component files** all use hardcoded Tailwind color classes (`bg-white`, `text-gray-700`, etc.)
- Touching all 118 files individually is impractical and error-prone
- Instead: define global CSS dark-mode overrides in `index.css` that remap common Tailwind classes (`.dark .bg-white`, `.dark .text-gray-900`, etc.)
- This handles ~90% of the app automatically — only Layout and a few special components need manual `dark:` tweaks
- ThemeContext manages state + localStorage persistence
- Animated toggle in the sidebar

---

## Step 1: Tailwind Config — Enable class-based dark mode

**File:** `tailwind.config.js`

Add `darkMode: 'class'` to the config. This enables Tailwind's `dark:` variant based on a `.dark` class on the root `<html>` element.

---

## Step 2: CSS Custom Properties + Global Dark Overrides

**File:** `src/index.css`

### 2a. Define theme CSS variables

```css
:root {
  --color-surface: #ffffff;
  --color-surface-raised: #f8fafc;
  --color-surface-overlay: #f1f5f9;
  --color-content: #0f172a;
  --color-content-secondary: #475569;
  --color-content-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-subtle: #f1f5f9;
  --glow-color: transparent;
}

.dark {
  --color-surface: #0f1729;
  --color-surface-raised: #1a2332;
  --color-surface-overlay: #243044;
  --color-content: #f1f5f9;
  --color-content-secondary: #cbd5e1;
  --color-content-muted: #94a3b8;
  --color-border: #2a3a52;
  --color-border-subtle: #1e2d42;
  --glow-color: rgba(60, 142, 197, 0.15);
}
```

### 2b. Global class remappings (the key trick)

Override the most common Tailwind utility classes when `.dark` is active on the root:

**Backgrounds:**
- `.dark .bg-white` → dark surface-raised (#1a2332)
- `.dark .bg-gray-50` → dark surface (#0f1729)
- `.dark .bg-gray-100` → dark surface-raised
- `.dark .bg-gray-200` → dark surface-overlay
- `.dark .bg-blue-50` → subtle blue tint (rgba(0,108,183,0.1))
- `.dark .bg-red-50`, `.bg-amber-50`, `.bg-green-50` → subtle tinted versions

**Text:**
- `.dark .text-gray-900` → #f1f5f9 (near-white)
- `.dark .text-gray-700` → #cbd5e1
- `.dark .text-gray-600` → #94a3b8
- `.dark .text-gray-500` → #64748b
- `.dark .text-blue-600` → #60a5fa (brighter blue)
- `.dark .text-red-600` → #f87171
- `.dark .text-green-600` → #4ade80

**Borders:**
- `.dark .border-gray-200`, `.border-gray-300` → dark border color
- `.dark .border-blue-200` → subtle blue glow border

**Shadows → Glow:**
- `.dark .shadow-md` → dark shadow + subtle blue glow
- `.dark .shadow-lg` → deeper shadow + stronger glow

**Inputs:**
- `.dark input, textarea, select` → dark surface-overlay bg, light text, dark border

**Gradients:**
- `.dark .from-blue-50` / `.via-sky-50` / `.to-white` → dark-appropriate gradient stops

**Images:**
- `.dark img { filter: none; }` — never invert images

**Transitions:**
- All background/color/border changes get `transition: 0.3s ease` for smooth toggling

---

## Step 3: ThemeContext — State management

**New file:** `src/contexts/ThemeContext.tsx`

- Provides: `theme` ('light' | 'dark' | 'system'), `setTheme()`, `resolvedTheme` ('light' | 'dark')
- On mount: reads from `localStorage('bee-studio-theme')`, defaults to 'system'
- Applies/removes `.dark` class on `document.documentElement`
- Listens to `window.matchMedia('(prefers-color-scheme: dark)')` for system mode
- Smooth class toggle with no flash on page load

---

## Step 4: ThemeToggle component — Animated sun/moon toggle

**New file:** `src/components/ThemeToggle.tsx`

- Compact pill-shaped toggle that fits in the sidebar footer
- Three modes via click cycle: Light → Dark → System
- Animated sun ↔ moon icon with rotation/scale transition
- Shows current mode label ("Light" / "Dark" / "Auto")
- Uses `Moon`, `Sun`, `Monitor` icons from lucide-react

---

## Step 5: Layout.tsx — Integrate toggle + targeted overrides

**File:** `src/components/Layout.tsx`

- Import and place `ThemeToggle` in sidebar footer (between Settings button and Quick Search hint)
- Also add to mobile sidebar footer
- Add `dark:` classes to the few elements CSS overrides can't reach:
  - `<kbd>` elements in Quick Search hint
  - Mobile overlay backdrop
  - Any inline gradient styles

---

## Step 6: main.tsx — Wrap app with ThemeProvider

**File:** `src/main.tsx`

- Add `ThemeProvider` as the outermost wrapper (before AuthProvider)
- This ensures theme is available before any UI renders

---

## Step 7: Spot-check critical components

Most components work automatically via the global CSS overrides. Manually review and add `dark:` variants only to components with:
- Complex inline gradients (e.g., `bg-gradient-to-r from-scripps-blue...` — these are fine, blue gradients look great on dark)
- Dynamic className logic that might conflict
- Modals with backdrop styling
- Tables with striped rows

Expected components needing minor tweaks:
- `Dashboard.tsx` — stat card gradients
- `AutopilotLaunch.tsx` — header gradient (likely fine as-is)
- `Settings.tsx` — tab panel backgrounds

---

## Dark Mode Design Language

| Element | Light | Dark |
|---------|-------|------|
| Page background | White/blue-50 gradient | Deep navy #0f1729 |
| Cards | White | Slate #1a2332 with subtle blue glow |
| Primary text | Near-black #0f172a | Near-white #f1f5f9 |
| Secondary text | Gray #475569 | Light slate #cbd5e1 |
| Borders | Light gray #e2e8f0 | Dark slate #2a3a52 |
| Shadows | Standard gray shadows | Dark shadows + blue glow |
| Active nav | Scripps blue gradient | Same (pops beautifully on dark) |
| Inputs | White bg, gray border | Dark overlay bg, slate border |
| Status colors | Standard red/amber/green | Brighter, more saturated versions |
| Images | As-is | As-is (no filters, no inversion) |
| Transitions | — | 300ms ease on all color properties |

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `tailwind.config.js` | Modify | Add `darkMode: 'class'` |
| `src/index.css` | Modify | CSS variables + global dark overrides |
| `src/contexts/ThemeContext.tsx` | **New** | Theme state + localStorage + system preference |
| `src/components/ThemeToggle.tsx` | **New** | Animated sun/moon/auto toggle |
| `src/main.tsx` | Modify | Wrap with ThemeProvider |
| `src/components/Layout.tsx` | Modify | Add ThemeToggle + minor dark: tweaks |
| ~3-5 component files | Minor modify | Targeted dark: overrides where CSS can't reach |

**Total new files:** 2
**Total modified files:** ~5-8
**Components auto-handled by CSS overrides:** ~110+ of 118
