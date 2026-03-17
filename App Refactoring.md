You are refactoring the layout of a Bootstrap-based web application.

Goal: introduce a centered layout wrapper for application pages **without interfering with existing Bootstrap containers or navbar layout**.

The project already uses Bootstrap containers extensively, including inside the navbar. This refactor must be completely non-destructive.

---

GENERAL RULES

Do NOT:

* override `.container`
* modify `.navbar` structure
* wrap the navbar in any new container
* change Bootstrap grid behavior
* change component spacing
* remove existing containers

Only introduce a safe wrapper for **application page content**.

---

STEP 1 — Create a new wrapper class

Create a layout class called `.app-container`.

Do NOT use `.container`.

CSS:

.app-container {
max-width: 1100px;
margin-left: auto;
margin-right: auto;
padding-left: 24px;
padding-right: 24px;
}

This class must not override Bootstrap styles.

---

STEP 2 — Add vertical page spacing

Add consistent breathing room for application pages.

main.app-container {
padding-top: 40px;
padding-bottom: 60px;
}

This must not affect spacing of cards or sections inside pages.

---

STEP 3 — Apply wrapper ONLY to application pages

Add `<main class="app-container">` to the main content area of these pages:

* dashboard.html
* group.html
* event.html
* court.html
* profile.html

Example structure:

<body>

<nav class="navbar navbar-expand-lg sticky-top">
  <div class="container">
    <!-- navbar content -->
  </div>
</nav>

<main class="app-container">

  <!-- existing layout remains unchanged -->

  <div class="container">
    existing content
  </div>

</main>

</body>

Important:

If a page already contains Bootstrap `.container` elements, DO NOT remove or modify them.

`.app-container` must simply wrap the existing page content.

---

STEP 4 — Do NOT apply wrapper to index.html

The landing page (index.html) often includes full-width sections such as:

* hero sections
* gradients
* banners
* marketing sections

To avoid layout conflicts:

Use `main.app-container` ONLY on application pages.

Do NOT add `.app-container` to index.html unless explicitly needed for specific non-hero content sections.

The landing page layout should remain unchanged.

---

STEP 5 — Preserve navbar layout

The navbar already uses the correct Bootstrap structure:

<nav class="navbar navbar-expand-lg sticky-top">
  <div class="container">

This must remain exactly the same.

Never wrap the navbar with `.app-container`.

---

EXPECTED RESULT

After the change:

* application pages gain a centered readable layout
* large screens look more balanced
* Bootstrap containers continue working normally
* navbar alignment remains unchanged
* landing page layout remains untouched

The visual appearance of components should remain identical except for improved page centering on large screens.
