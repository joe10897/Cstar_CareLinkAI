---
name: Warm Clinical Paper
colors:
  surface: '#fbf8fc'
  surface-dim: '#dcd9dd'
  surface-bright: '#fbf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2f7'
  surface-container: '#f0edf1'
  surface-container-high: '#eae7eb'
  surface-container-highest: '#e4e1e6'
  on-surface: '#1b1b1e'
  on-surface-variant: '#3e4947'
  inverse-surface: '#303033'
  inverse-on-surface: '#f3f0f4'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#006d30'
  on-secondary: '#ffffff'
  secondary-container: '#92f5a4'
  on-secondary-container: '#007233'
  tertiary: '#7d4200'
  on-tertiary: '#ffffff'
  tertiary-container: '#a15600'
  on-tertiary-container: '#ffe6d5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#95f8a7'
  secondary-fixed-dim: '#79db8d'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#005323'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#fbf8fc'
  on-background: '#1b1b1e'
  surface-variant: '#e4e1e6'
  bg-canvas: '#F8F7F4'
  surface-card: '#FFFFFF'
  surface-subtle: '#F1EFEA'
  surface-dark: '#1E242B'
  ink-primary: '#18181B'
  ink-secondary: '#52525B'
  ink-muted: '#8E8E93'
  status-safe: '#15803D'
  status-warn: '#D97706'
  status-danger: '#DC2626'
  landmark-ear: '#8B5CF6'
  landmark-eye: '#38BDF8'
  landmark-nose: '#F59E0B'
  landmark-mouth: '#F43F5E'
  landmark-cheek: '#34D399'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-numeric-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system blends **Warm Clinical Precision** with **Domestic Care Calm**, translating medical rigor into an approachable, tactile daily experience. Designed for pet parents navigating clinical uncertainties and daily companion tracking, the aesthetic discards sterile, anxiety-inducing hospital blues and aggressive tech gradients in favor of an organic parchment foundation paired with restorative spruce teal.

### Design Movement & Aesthetic Pillars
- **Warm Paper Substrates:** Grounded in a calming warm-white canvas (`#F8F7F4`) that reduces the physiological stress of health tracking, contrasted with crisp paper-white cards (`#FFFFFF`) to establish focus and tactile organization.
- **Scientific High-Density Readability:** Medical telemetric clarity rendered through monospace numerals for pain scoring (FGS), feline facial landmarks, and blood panel chemistry ranges (BUN, CREA, SDMA).
- **Anti-Slop Utility:** Zero artificial fluff. Every UI tier serves diagnostic or triage clarity without decorative noise or pseudo-3D visual clutter.
- **Contextual Dichotomy:** Soft, natural daylight hues for day-to-day pet management transitioning into an ultra-precise high-contrast dark room (`#1E242B`) for computer-vision facial alignment and landmark inspection.

## Colors

The color system establishes functional clarity across veterinary workflows and daily pet logging:

- **Primary (`#0F766E` Deep Spruce Teal):** Anchors brand authority, active states, key interactive targets, and confirmed health actions.
- **Neutral Canvas & Surfaces (`#F8F7F4` Canvas, `#FFFFFF` Cards, `#F1EFEA` Subtle Fills):** Establishes a warm clinical foundation that shields pet owners from medical anxiety while maintaining clean card boundaries.
- **Ink Tiers (`#18181B` Primary Ink, `#52525B` Secondary, `#8E8E93` Subdued):** High legibility contrast optimized for bilingual Latin and Traditional Chinese glyphs.
- **Triage Status Palette:** Strict semantic assignment:
  - `status-safe` (`#15803D`): FGS Score 0–1, normal blood chemistry values, completed sitter logs.
  - `status-warn` (`#D97706`): FGS Score 2–3, borderline physiological drifts, scheduled observation.
  - `status-danger` (`#DC2626`): FGS Score $\ge 4$, critical lab redlines, emergency hospital handoff.
- **FGS 48-Point Anatomical Coordinate Spectrum:** Dedicated clinical landmark hues engineered to maintain distinguishable chroma against both `#FFFFFF` and `#1E242B` camera feeds:
  - Ear Pinnae (01–10): Violet `#8B5CF6`
  - Orbital Rim (11–26): Sky Cyan `#38BDF8`
  - Muzzle & Nasal Ridge (27–34): Ochre Amber `#F59E0B`
  - Lips & Mandible (35–38): Coral Carmine `#F43F5E`
  - Whisker Pads & Cheeks (39–48): Mint Teal `#34D399`

## Typography

The typographic hierarchy accommodates clean cross-language rendering across Latin text and Traditional Chinese glyphs:

- **Primary Display & Text Engine (`Plus Jakarta Sans` with fallback to `Noto Sans TC`):** Delivers welcoming, open aperture geometry that avoids cold corporate rigidity while ensuring legibility at small sizes on mobile devices.
- **Precision Data Engine (`JetBrains Mono`):** Applied exclusively to structured data—FGS score readouts (e.g. `04/10`), anatomical point numbers (`01`–`48`), blood panel markers (`BUN 42.1 mg/dL`), pricing figures, and GPS check-in timestamps. Monospace sizing eliminates layout jitter during live sensor and camera telemetry updates.
- **Mobile Readability Rules:** Never truncate tab navigation labels or critical clinical dosages. Micro labels must retain clear stroke separation with a minimum size of 11px.

## Layout & Spacing

Layouts adhere to an 8pt baseline grid with zero horizontal overflow tolerance across 320px, 375px, 414px, and 768px viewport widths.

### Screen Layout Principles
- **Mobile First Canvas (`max-width: 480px` on portable displays):** Uses an outer canvas margin of `1rem` (16px), tightening to `0.75rem` (12px) on narrow 320px devices.
- **Bento Grid Daily Matrix (`2x3` layout):** Built with `grid-template-columns: repeat(2, minmax(0, 1fr))` and an internal gap of `0.75rem` (12px). Each Bento card maintains structured content padding of `1rem` (`space-md`).
- **Horizontal Context & Pill Rail:** AI Triage symptom shortcuts and pet selector chips utilize single-row flex layouts with CSS scroll-snap (`scroll-snap-type: x mandatory; padding-inline: 1rem; gap: 0.5rem`), explicitly hiding scrollbars for native touch fluidness.
- **Safe Area Inset Buffering:** Bottom floating layers must combine static dimensioning (`64px` tab height or action containers) with dynamic platform padding (`padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))`).
- **Desktop Administration Workspace (`/admin/*`):** Reflows into a persistent 280px navigation rail paired with a 12-column adaptive workspace using `1.5rem` gutters and `2rem` screen margins.

## Elevation & Depth

This system avoids heavy, artificial drop shadows, relying instead on **tactile paper layering** and soft physical borders:

- **Elevation 0 (Canvas Base):** Flat `#F8F7F4` background without border or shadow.
- **Elevation 1 (Card & Bento Grid):** Solid `#FFFFFF` surface bordered with subtle neutral definition: `border: 1px solid rgba(24, 24, 27, 0.06); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02)`.
- **Elevation 2 (Interactive Floating Controls & Chat Bubbles):** Enhanced card layering for active status items and user prompts: `box-shadow: 0 4px 12px -2px rgba(15, 118, 110, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)`.
- **Elevation 3 (Sheets, Dialogs, Floating Navigation Bar):** Pure white container layered with an ambient, diffused grounding shadow: `box-shadow: 0 -4px 20px rgba(24, 24, 27, 0.06)`. Accompanied by a gentle backdrop barrier: `background: rgba(24, 24, 27, 0.4); backdrop-filter: blur(4px)`.
- **FGS Dark Vision Mode:** In computer-vision camera contexts (`#1E242B`), surfaces drop all diffuse shadows and switch to luminous geometric boundary rings (`1px solid rgba(255, 255, 255, 0.12)`).

## Shapes

The shape system employs roundedness level **2**, striking a balanced medical-grade aesthetic that remains gentle and friendly:

- **Base Elements (`rounded-md`, 8px / 0.5rem):** Form inputs, quick counter buttons, timestamp tags, and monospace lab data chips.
- **Cards & Bento Panels (`rounded-xl`, 16px / 1rem):** Daily tracker Bento tiles, AI dialogue bubble cards, OCR split-verification panes, and sitter review milestones.
- **Overlays & Drawers (`rounded-2xl`, 24px / 1.5rem top corners):** Bottom Sheets, Action Sheets, and modal surfaces.
- **Pills & Status Identifiers (`rounded-full`, 9999px):** Active Context tags, category filter buttons, camera capture triggers, and pet profile avatar rings.

## Components

### 1. Buttons & Action Triggers
- **Primary Action (Brand Teal):** Background `#0F766E`, text `#FFFFFF`, font-weight 600. Hover/active states darken to `#115E59`. Height `48px` on mobile for tactile ergonomics.
- **Secondary Action (Subtle Paper):** Background `#F1EFEA`, text `#18181B`, border `1px solid rgba(24, 24, 27, 0.06)`.
- **Triage Urgent (Danger):** Background `#DC2626`, text `#FFFFFF`. Reserved strictly for hospital handoffs or high-risk FGS alerts.

### 2. Five-Tab Bottom Navigation Bar
- **Geometry:** Height `64px` plus `env(safe-area-inset-bottom)`. Background `#FFFFFF`, top border `1px solid rgba(24, 24, 27, 0.08)`.
- **Tab Layout:** 5 equal columns: (1) 日常與掃描, (2) AI 問診室, (3) 數據追蹤, (4) 到府保姆, (5) 毛孩檔案.
- **State Styling:**
  - Active: Icon and text colored in `#0F766E` with font-weight 600.
  - Inactive: Icon and text colored in `#8E8E93`.
  - Behavior: Text set to `white-space: nowrap; font-size: 11px;`. No line wraps permitted under any viewport width.

### 3. Bento Grid Daily Logging Cards
- **Architecture:** Two-column grid using `#FFFFFF` cards with `16px` border-radius.
- **Components per Tile:**
  - Distinct Category Header: 12px muted label alongside a semantic iconography stamp.
  - Core Metric Display: JetBrains Mono value readouts (e.g. `240 ml`, `4.85 kg`).
  - Tactile Controls: Compact step steppers (`+50ml`) or 3-step pill selectors (`正常 / 減半 / 拒食`) styled in subtle `#F1EFEA`.

### 4. Bottom Sheet & Action Sheet
- **Structure:** Slides up from canvas bottom. Background `#FFFFFF` with `rounded-t-[24px]` radius, top drag handle (`w-10 h-1 bg-[#8E8E93]/40 rounded-full mx-auto my-3`).
- **Action Sheet Variant:** Destructive actions highlighted in `#DC2626`. Options separated by subtle borders (`1px solid #F1EFEA`). Canceled action presented as an isolated button pill at the base.

### 5. Snackbar & System Toasts
- **Form:** Floats `16px` above the bottom navigation bar or keyboard anchor.
- **Visuals:** Dark paper container `#1E242B` with high-contrast text `#FFFFFF` and `rounded-xl` geometry.
- **Semantics:** Includes a left-aligned status glyph: Safe (`#34D399`), Alert (`#F59E0B`), Danger (`#F43F5E`).

### 6. AI Context Capsule Bar & Chat Bubble
- **Context Capsule Bar:** Top-pinned horizontal rail showing active context chips (e.g., `[已掛載：10/15 血檢]`, `[FGS: 1/10]`) in `#F1EFEA` pills with `#0F766E` accents.
- **AI Structured Bubble:** White surface card containing a triage traffic light badge, markdown bullet points, clinical action checklists, and the mandatory veterinary disclaimer micro-label (`#8E8E93`, 11px).

### 7. FGS 48-Point Annotation Canvas & Inspection HUD
- **Canvas Base:** `#1E242B` dark room surface with overlaid camera video stream.
- **Keypoint Pins:** `6px` circular nodes surrounded by a `2px` semi-transparent glow in that zone's anatomical color (Ear `#8B5CF6`, Eye `#38BDF8`, Nose `#F59E0B`, Mouth `#F43F5E`, Cheek `#34D399`).
- **Telemetry Pin Labels:** 10px JetBrains Mono numerical flags (`01`–`48`) that scale smoothly during Zoom-to-ROI interactions.