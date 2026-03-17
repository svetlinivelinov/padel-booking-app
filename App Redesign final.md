You are refactoring the layout of a web application UI.

Goal: introduce a consistent centered **page container** across the app to improve readability, spacing, and layout consistency.

Follow these rules carefully.

---

GENERAL PRINCIPLE

Most professional web apps constrain page content width instead of letting it stretch across the entire screen.

Implement a reusable container that:

* centers content
* limits maximum width
* adds consistent horizontal padding
* keeps navigation bars full width

---

STEP 1 — Create a reusable container class

Add a global layout container with the following behavior:

max-width: 1100px
margin-left: auto
margin-right: auto
padding-left: 24px
padding-right: 24px

Example CSS:

.container {
max-width: 1100px;
margin-left: auto;
margin-right: auto;
padding-left: 24px;
padding-right: 24px;
}

---

STEP 2 — Apply the container to page content

Wrap the main content of every page inside the container.

Example structure:

<body>

<nav>
  <!-- navigation stays full width -->
</nav>

<main class="container">

  <!-- page header -->

  <!-- page sections -->

  <!-- cards / forms / lists -->

</main>

</body>

The container should wrap:

* dashboard content
* groups page
* events page
* court page
* profile page

---

STEP 3 — Do NOT wrap these elements

Keep these elements full width:

* navigation bar
* landing page hero sections
* background gradients that should span the screen

Only constrain the **main application content**.

---

STEP 4 — Add consistent vertical page spacing

Add vertical spacing to the main container so pages breathe better.

Example:

main.container {
padding-top: 40px;
padding-bottom: 60px;
}

---

STEP 5 — Ensure responsive behavior

The container should behave like this:

Large screens
content stays centered with max-width 1100px.

Medium screens
content shrinks naturally.

Small screens
content uses full width but keeps horizontal padding.

No horizontal scrolling should occur.

---

STEP 6 — Do not modify existing components

Do not change:

* card styles
* form inputs
* button styling
* typography

Only introduce the container and apply it consistently.

---

EXPECTED RESULT

All application pages now have:

* centered readable layout
* consistent margins
* improved visual balance on large screens
* unchanged functionality
