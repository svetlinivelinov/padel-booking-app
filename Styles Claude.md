Design System Brief — Final
Bokacourt
Dark Glass UI — Padel Booking App

DM Sans
Typeface
#1A6FFF
Primary accent
#C8CC50
Lime accent
Dark glass
Visual style


Section 01
Direction
Bokacourt is a premium padel court booking app. The visual language is dark, sporty, and high-end — deep navy backgrounds, layered glass morphism cards, and a dual accent system pulled directly from the sport: electric blue for actions and UI, yellow-lime for highlights and active states (the colors of a Babolat racket and ball).
The feeling is a premium padel club at night. The product should feel fast, confident, and exclusive — the kind of app that matches the club it represents.

Tone
Dark, sporty, premium — confident without being cold
Audience
Active adults 25–45, competitive, design-literate, mobile-native
Feeling
Night court energy — fast, precise, high-end
Visual style
Dark navy base, glass morphism cards, dual accent (blue + lime)
Reference
Sorare, premium fitness apps, Babolat brand aesthetics
Anti-reference
Warm neutrals, light mode SaaS, country club heritage

Section 02
Visual System
Background & Depth
The background is never flat black. Deep navy (#070E1C) with radial blue halos — concentrated at the top-left and top-right — creates the sense of depth and premium atmosphere. A faint warm tint at the bottom echoes the tennis ball.

Page bg
#070E1C — deep navy, not black
Halo 1
radial-gradient at 15% 5%, rgba(0,70,160,0.55) — top left blue glow
Halo 2
radial-gradient at 85% 20%, rgba(0,50,130,0.35) — top right blue glow
Warm tint
radial-gradient at 50% 90%, rgba(180,140,0,0.08) — subtle lime warmth

Glass Morphism Cards
Every card is a glass panel floating above the background. The effect relies on three layers working together: a semi-transparent dark blue fill, a faint border, and edge shine lines that simulate light catching the glass surface.

Card fill
rgba(8,20,50,0.52) — dark blue, semi-transparent
Card border
1px solid rgba(200,220,255,0.09)
Border radius
16px
Backdrop filter
blur(12–20px) — heavier blur for more depth
Top shine
1px line, lime-gold gradient: rgba(210,190,80,0.55) → rgba(255,240,120,0.7) → rgba(210,190,80,0.55)
Left shine
1px vertical line, same lime-gold gradient, 10%–90% height
Top accent bar
2px gradient line on event cards: rgba(200,210,40,0.6) → rgba(230,240,60,0.85) → rgba(200,210,40,0.6)
Input fill
rgba(10,25,65,0.7) — darker blue for form fields inside cards
Input border
1px solid rgba(60,100,180,0.25)

The shine lines are the detail that makes the glass feel real. Top edge for horizontal light, left edge for the vertical catch. Both use the lime-gold tones from the racket rather than white — keeps the palette coherent.

Section 03
Typography
Single typeface: DM Sans. All weights. No mixing. The hierarchy is built entirely through weight and size — the dark background does the work of making text feel premium, so the type stays clean and functional.

Typeface
DM Sans — 400, 500, 600, 700, 800
Hero / titles
800 ExtraBold, 26–28px, #DCE8FF, letter-spacing -0.02em
Card titles
700 Bold, 16–18px, #C8D8F0
UI labels
600 SemiBold, 10–11px, rgba(150,175,220,0.45), uppercase, 0.09em tracking
Body / metadata
400–500, 12–14px, #8CABD7 or rgba(140,170,215,0.5)
Placeholders
400, 14px, rgba(140,170,215,0.35)
Nav brand
800, 18px, #DCE8FF, letter-spacing -0.02em

Section 04
Color System
Two accents, one palette, clear roles. Blue owns actions — CTAs, active states, avatar borders, the Book Court button. Lime owns highlights — the active nav indicator, card top accent bars, availability chips, bullet points. They never swap roles.
Base Palette

Name
Hex / Value
Role

Void
#070E1C
Page background

Navy
#0F1923
Phone/app shell surface

Deep Blue
#081432
Glass card fill base

Abyss
#0A1628
Input field fill

Ice White
#DCE8FF
Primary text, headings, brand name

Cool White
#C8D8F0
Secondary text, card titles

Steel Blue
#8CABD7
Muted text, metadata

Slate
#4A6070
Faint labels, inactive nav

Electric Blue
#1A6FFF
Primary CTA, active elements, glow

Sky Blue
#7EB8FF
Avatar text, chip text, button light

Padel Lime
#C8CC50
Active nav, card accent bar, chips, bullets

Lime Dim
#A0A830
Lime on lighter surfaces, eyebrows

Glass Border
#1E3060
Card and input borders — rgba(200,220,255,0.09)

Shine Gold
#4A3C10
Card edge shine lines — rgba(210,190,80,0.55)

Design Tokens
Every component uses these tokens. Raw rgba values only exist in this table — never in component CSS.

CSS Variable
Value
Usage
--color-bg
#070E1C
Page background
--color-surface
rgba(8,20,50,0.52)
Glass card fill
--color-surface-input
rgba(10,25,65,0.7)
Form input fill
--color-text
#C8D8F0
Primary text
--color-text-bright
#DCE8FF
Headings, brand name
--color-text-muted
#8CABD7
Secondary text
--color-text-faint
rgba(140,170,215,0.45)
Labels, placeholders
--color-border
rgba(200,220,255,0.09)
Card and input borders
--color-border-input
rgba(60,100,180,0.25)
Input border — slightly warmer
--color-accent
#1A6FFF
Primary action — CTAs, active
--color-accent-light
#7EB8FF
Text on accent-colored surfaces
--color-accent-glow
rgba(20,90,255,0.4)
Button box-shadow glow
--color-accent-bg
rgba(20,100,255,0.2)
Chip and badge backgrounds
--color-lime
#C8CC50
Active nav, accent bars, bullets
--color-lime-bg
rgba(190,200,30,0.12)
Lime chip background
--color-lime-border
rgba(190,200,30,0.28)
Lime chip border
--color-shine
rgba(210,190,80,0.55)
Card edge shine — top and left
--color-divider
rgba(200,220,255,0.06)
Internal card dividers

Section 05
Components
Glass Card
The core surface. Used for all grouped content — Joining As, Event cards, empty states. Every card has the same base treatment; the top accent bar is added only on event/booking cards.

Fill
var(--color-surface)
Border
1px solid var(--color-border)
Border radius
16px
Backdrop filter
blur(12px) on standard cards, blur(20px) on hero cards
Top shine
Absolute 1px element, 10%–90% width, lime-gold gradient
Left shine
Absolute 1px element, 10%–90% height, lime-gold gradient
Top accent bar
Absolute 2px element at top-0, full width, lime gradient — event cards only
Overflow
hidden — required for shine and accent bar positioning

Form Inputs
All inputs — text fields, selects, textareas — share the same dark blue treatment. No input should appear lighter or warmer than its card background.

Fill
var(--color-surface-input) — rgba(10,25,65,0.7)
Border
1px solid var(--color-border-input) — rgba(60,100,180,0.25)
Border radius
10px
Text color
var(--color-text) — #C8D8F0
Placeholder
rgba(140,170,215,0.35)
Labels
10–11px, uppercase, 0.09em tracking, var(--color-text-faint)
Focus
border-color rgba(26,111,255,0.5), no outline
Select arrow
Custom SVG chevron, var(--color-text-faint), appearance: none

Primary CTA Button — Book Court / Book / Explore
Background
linear-gradient(135deg, #1A6FFF, #0A4FD4)
Text
#E8F0FF, DM Sans 700, 13–14px, letter-spacing 0.02em
Border radius
9px, height 44–52px
Box shadow
0 4px 18px var(--color-accent-glow)
Hover
brightness 1.1, translateY(-1px), 160ms ease
Active
scale(0.98), brightness 0.95, 80ms
Disabled
opacity 0.4, no shadow, no transform

Ghost Button
Background
rgba(255,255,255,0.05)
Border
1px solid var(--color-border)
Text
rgba(160,185,225,0.7), DM Sans 500
Hover
background rgba(255,255,255,0.08), 160ms

Availability Chips
Lime chip
bg var(--color-lime-bg), text var(--color-lime), border var(--color-lime-border)
Blue chip
bg var(--color-accent-bg), text var(--color-accent-light), border rgba(20,100,255,0.35)
You're In
Blue chip variant — uppercase, 10px, 700 weight
Leave
Ghost chip — var(--color-border) fill, var(--color-text-muted) text
Anatomy
border-radius 6px, padding 4px 11px, DM Sans 700 10–11px, 0.05em tracking

Player Avatars
Confirmed
34px circle, rgba(20,80,200,0.22) fill, 1.5px solid rgba(20,100,255,0.4) border
Initials
12px DM Sans 700, var(--color-accent-light) — #7EB8FF
Empty slot
34px circle, rgba(255,255,255,0.02) fill, 1.5px dashed rgba(200,220,255,0.1) border
Empty icon
11px plus SVG, rgba(200,220,255,0.15) stroke
Slot label
11px, rgba(140,170,215,0.25) — very faint

Navigation
Top nav bg
rgba(5,12,28,0.75), backdrop-filter blur(16px)
Top nav border
1px solid rgba(200,220,255,0.06) bottom
Brand
DM Sans 800 18px, #DCE8FF, letter-spacing -0.02em
Nav links
DM Sans 500 12px, rgba(140,170,215,0.4) — inactive
Bottom nav bg
rgba(5,10,22,0.85), backdrop-filter blur(16px)
Active tab
Icon + label in var(--color-lime), 2px top border in rgba(200,210,40,0.7)
Inactive tab
Icon + label in rgba(100,135,195,0.35)

Section 06
Motion
Fast and precise. This is a booking app — interactions should feel immediate. Nothing lingers.

Page enter
Fade + slide up 10px, 200ms ease-out
Card stagger
40ms delay per card, 180ms ease-out
Button press
scale(0.98) + brightness, 80ms — tactile
Hover
150–180ms ease — color, shadow, transform
Modal / sheet
Slide up from bottom, 240ms ease-out
Max duration
300ms — nothing takes longer
Reduced motion
All animations instant, prefers-reduced-motion respected

Section 07
Responsive
Mobile is the primary surface. The glass effect must hold on small screens — avoid over-blurring on low-powered devices.

Mobile
0–767px — 1 column, 18px padding, bottom nav, full-width CTAs
Tablet
768–1023px — 2-col grid, 24px padding
Desktop
1024px+ — 3-col grid, 40px padding, top nav, max-width 1360px

Mobile rules
    • Hero: 26px, not 36px — keep it tight
    • Cards: remove translateY hover on touch, keep box-shadow
    • Backdrop filter: reduce blur to 8px on mobile for performance
    • Inputs: minimum 44px tap target height
    • Bottom nav: 64px + safe area inset
    • Time slot picker: horizontal scroll row, not a dropdown
    • CTAs: full-width inside card context

Section 08
Implementation Order
Build in this exact sequence. The background and token layer must exist before any glass effect will look correct.

    1. CSS custom properties — all --color-* tokens in :root
    2. Page background — deep navy + radial halo gradients
    3. Google Fonts import — DM Sans 400, 500, 600, 700, 800
    4. Typography scale — apply weights and sizes globally
    5. Glass card base — fill, border, blur, shine, accent bar
    6. Form inputs — dark blue fill, matching border, custom select
    7. Top navigation — blur bar, brand, Book Court CTA button
    8. Bottom tab navigation — active lime state, blur background
    9. Event card — full component with player avatars and chips
    10. CTA buttons — primary gradient, ghost, disabled, loading
    11. Availability chips — lime, blue, ghost variants
    12. Empty state card — illustration + CTA layout
    13. Motion system — entrance, stagger, press feedback
    14. Responsive breakpoints — mobile blur reduction, tap targets


Visual design only. Routing, API integration, and business logic are untouched. Build in the order listed — background and tokens before any glass components.