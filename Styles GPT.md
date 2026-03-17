Visual tone & foundations
Visual tone: modern padel club, dark base, electric blue accents, cool neutrals, subtle glow highlights.
Typography pairing: elegant serif for key headlines + clean geometric sans for UI (e.g. Manrope or Satoshi).
Surface system: frosted glass cards, blue‑tinted glass nav, crisp borders, soft depth shadows, confident spacing.
Motion: smooth, minimal, sport‑tech—fade, slide, and hover transitions that feel precise, not flashy.

1. Typography upgrade
Files: public/index.html, public/dashboard.html
- Body font: keep Space Grotesk or switch to Manrope for a clean, modern sport feel.
- Display serif: use Playfair Display (or similar) only for hero and section titles to create a premium contrast.
- Usage rule: serif for big titles like “Upcoming Events”, sans‑serif for everything interactive (labels, buttons, inputs).

2. Color system refinement
File: public/assets/css/style.css
- Palette direction:
- Background: deep charcoal / near‑black
- Surface: dark slate with subtle blue tint
- Accent: padel blue (primary), soft cyan (secondary)
- Text: off‑white for primary, cool gray for secondary
- CTA: solid or glowing blue, with subtle outer glow on hover
- Add semantic variables:
- --bg-base, --bg-surface, --bg-surface-elevated
- --border-soft, --accent, --accent-strong, --text-primary, --text-muted
- Use these tokens across all pages for consistent, brandable styling.

3. Card and layout elevation
File: public/assets/css/style.css
- Cards: slightly larger radius, frosted glass effect, two‑layer shadow (soft ambient + tighter focus).
- Top highlight: add a faint top border with low‑opacity blue/white for premium depth.
- Rhythm: more breathing room between sections, tighter internal spacing for event rows and controls.

4. Button polish
File: public/assets/css/style.css
- Primary CTA: solid blue with subtle vertical gradient, soft glow, and lift on hover; slight “press in” on active.
- Secondary (ghost) button: transparent background, blue border, blue text, stronger fill on hover.
- Destructive: red outline or fill, but still within the cool, modern palette.

5. Navbar refinement
File: public/assets/css/style.css
- Glass nav: stronger blur, blue‑tinted translucent background, subtle bottom shadow line.
- Active state: animated underline or small blue dot under the active link (e.g. “Events”).
- CTA: “Book Court” as a glowing blue pill button on the right.

6. Event and group cards UX polish
Files: public/assets/js/events.js + public/assets/css/style.css
- Status chips: pill chips in blue (joined), gray (waitlist), red (full/cancelled).
- Hierarchy:
- First line: date + time
- Second: capacity (2 / 4 · 2 spots left)
- Third: actions (You’re In, Leave, Edit)
- Empty states: add padel gear illustrations (blue rackets, yellow balls, cap, bottle) with short, friendly copy.

7. Micro‑motion system
File: public/assets/css/style.css
- Page load: fade‑up for hero and main cards.
- Lists: slight stagger (40–80ms between items) for event rows.
- Hover: small translate‑Y and shadow lift on cards and CTAs.
- Timing: keep between 180ms–320ms for everything—smooth, premium, not gimmicky.

If you want, I can now rewrite these as concrete CSS + HTML snippets for one page first (e.g. dashboard.html) so you can drop them in and see the transformation.
