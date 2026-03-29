1. Fix the Primary Accent Color (Most Important)

Right now you have:

Yellow text on buttons

Blue buttons

Blue outlines

Blue background gradients

This creates too many competing accents.

Problem

The yellow text is fighting the blue UI.

Better approach

Choose ONE primary accent color.

Two excellent options:

Option A — Electric Blue (recommended)

Primary color:

#3B82F6

Use it for:

Buttons

Focus states

Active navigation

Links

Buttons become:

Background: #3B82F6
Text: white
Hover: #2563EB

Remove yellow text completely.

Option B — Neon Lime Accent (more sporty)

If you want a sports/padel energy look, use the yellow as the accent instead.

Primary:

#C7FF00

Then buttons should be:

Background: #C7FF00
Text: #02142b
Hover: #d8ff3d

But do not mix both.

2. Improve Background Depth

Your background gradient is good but too flat.

Current feel:

dark blue → slightly darker blue

Better layered depth:

#020617  (base)
#02142b  (mid)
#06254d  (top gradient)

Example:

background: linear-gradient(
180deg,
#06254d 0%,
#02142b 60%,
#020617 100%
);

This creates cinematic depth.

3. Cards Need Separation

Your cards blend into the background too much.

Current

Very similar colors.

Improve with:
Card background: #071a33
Border: 1px solid rgba(255,255,255,0.06)
Shadow: 0 10px 25px rgba(0,0,0,0.35)

Example:

.card {
background:#071a33;
border:1px solid rgba(255,255,255,0.06);
box-shadow:0 10px 25px rgba(0,0,0,0.35);
border-radius:14px;
}

This makes cards float slightly above the page.

4. Improve Input Fields

Inputs currently look a bit flat and heavy.

Better UX:

background: #041428
border: 1px solid #17365d
focus border: primary color

Example:

input, textarea {
background:#041428;
border:1px solid #17365d;
}

Update (March 2026)
- Replace all navigation references to `Groups` with `Upcoming`.
- Any styling guidance for `Your groups` and `Join with invite token` sections is legacy.
- Invite-token entry UI is deprecated in favor of event invite links.

input:focus {
border-color:#3B82F6;
box-shadow:0 0 0 2px rgba(59,130,246,0.2);
}

This gives users clear feedback while typing.

5. Improve Button Hierarchy

Currently both buttons look equally important.

But UX priority is:

1️⃣ Your groups
2️⃣ Create group
3️⃣ Join group

So visually:

Primary button
Create
Secondary button
Join

Example:

Primary:

Background: #3B82F6
Text: white

Secondary:

Background: transparent
Border: 1px solid #3B82F6
Text: #3B82F6

This creates clear visual hierarchy.

6. Improve Section Hierarchy

Your section title Your groups looks visually weaker than the cards above it.

Make it stronger.

Example:

font-weight: 700
font-size: 22px
color: #e6f0ff

And add spacing:

margin-top: 40px
7. Improve Navbar Active State

Current "Groups" highlight is subtle.

Better:

Active item:
color: #3B82F6
underline or glow

Example:

.nav-active {
color:#3B82F6;
font-weight:600;
}
8. Add Micro-Interactions (Huge UX Upgrade)

Hover states dramatically improve UX.

Buttons:

transform: translateY(-1px)
box-shadow: 0 6px 14px rgba(0,0,0,0.25)

Cards:

hover → border brightens

Example:

.card:hover{
border-color:rgba(255,255,255,0.12);
}
9. Improve Placeholder Color

Current placeholders look too bright.

Better:

#6b8bb3

Example:

::placeholder{
color:#6b8bb3;
}
10. Add Icon Color Highlights

Example:

Create group → plus icon
Join group → link icon

Icon color:

#3B82F6

This improves scanability.

Ideal Final Color System

Background

#020617
#02142b
#06254d

Cards

#071a33

Text

Primary: #e6f0ff
Secondary: #9bb3d4

Accent

#3B82F6

Borders

rgba(255,255,255,0.06)
Result After These Changes

Your UI will feel:

✅ cleaner
✅ more premium
✅ more readable
✅ less visually noisy
✅ more interactive

Basically closer to Stripe / Linear / Vercel level polish.