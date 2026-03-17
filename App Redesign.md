
Copilot Implementation Instructions – UI Redesign
You are refactoring an existing web app UI.
The goal is improving usability and layout priority while keeping the current design system and styling.
General principles:
    • Prioritize primary user actions
    • Move secondary actions below or behind toggles
    • Avoid wasted columns
    • Keep content full-width where possible
    • Prefer compact rows for selectors
    • Maintain existing CSS framework/classes where possible
    • Avoid large layout rewrites unless necessary

1. dashboard.html
Problem
The page currently uses two columns:
    • Left (col-4) → group selector
    • Right (col-8) → upcoming events feed
The group selector wastes an entire column for a single dropdown.
Goal
Move the group selector into a compact row above the feed so the event feed can use full width.
Implementation
Replace current layout
From something like:
row
 ├ col-4 → group selector
 └ col-8 → events feed
With:
row (compact header)
 ├ label: "Group"
 └ dropdown selector
row
 └ col-12 → events feed cards
Details
    1. Add a small horizontal row above the feed.
    2. Put:
        ◦ "Group" label
        ◦ dropdown selector
    3. Align them side-by-side.
    4. The events feed should become full width.
    5. Event cards remain unchanged.
Result
Users immediately see all upcoming events, and the selector becomes a simple filter control.

2. event.html
Problem
Current layout:
col-5 → Create event form
col-7 → Event list
But most users join events, not create them.
The form permanently occupies half the screen.
Goal
    • Hide the create event form behind a button
    • Give the event list full width
    • Expand the form only when needed
Implementation
Top of page
Add a button:
[ + Create event ]
Behavior
When clicked:
    • Expand the create event form inline
    • Push the event list down
Layout
Default:
row
 └ col-12 → Event list
When button clicked:
row
 └ col-12 → Create event form
row
 └ col-12 → Event list
Optional UX improvement
Use:
details / summary
or
collapsible div
or
JS toggle
Result
    • Members see events immediately
    • Organizers can still create events easily

3. group.html
Problem
Current order:
Create group
Join with invite
Your groups
The most important section (Your Groups) is pushed below the fold.
Goal
Make Your Groups the first section.
Implementation
New order
Your Groups
Create group
Join group
Layout suggestion
row
 └ col-12 → Your groups list
row
 ├ col-6 → Create group
 └ col-6 → Join group
Alternative option
Use tabs in one card
[Create] [Join]
Inside the same card.
Result
The page feels like a dashboard, not an onboarding page.

4. profile.html
Problem
Current structure is good:
    • centered card
    • all fields inside
But Sign Out is inside the same card, near the save button.
This creates a dangerous accidental click.
Goal
Separate Save Profile from Sign Out.
Implementation
Keep:
Profile card
 └ fields
 └ Save button
Move Sign Out to one of these:
Option A (Preferred)
A separate small card below
Profile Card
Danger Zone Card
  └ Sign Out button
Option B
Place Sign Out in navbar dropdown.
Result
Clear separation between:
    • saving profile
    • leaving the app

5. index.html (Landing Page)
Problem
The features section is currently:
• bullet list
• plain text
This feels weak compared to the rest of the UI.
Goal
Convert the feature list into 4 icon cards.
Implementation
Replace bullet list with:
grid (2x2)
Structure:
row
 ├ col-md-6 → Feature card
 ├ col-md-6 → Feature card
 ├ col-md-6 → Feature card
 └ col-md-6 → Feature card
Each card should contain:
icon
feature title
short description
Example:
[icon]
Create Games
Organize matches quickly with your group.
Use:
    • small glass / soft cards
    • consistent spacing
Result
The page feels more premium and visual.

6. court.html
Problem
Layout is fine:
    • single column
    • max width ~700px
But when no game is active, the page looks empty.
Goal
Add a clear empty state.
Implementation
When there is no active game, show:
Event selector dropdown
"No active game right now"
Next event:
Tuesday 19:30
Example layout:
event selector
empty state card
 ├ icon
 ├ message
 └ next scheduled game
Result
The page feels alive instead of abandoned.

Final Design Rules
When implementing:
    1. Avoid unnecessary layout nesting
    2. Prefer full-width primary content
    3. Collapse rare actions
    4. Prioritize frequently visited data
    5. Maintain current theme and styling

✅ After implementing:
    • Verify responsiveness
    • Ensure mobile layouts stack correctly
    • Keep consistent spacing with existing CSS utilities
