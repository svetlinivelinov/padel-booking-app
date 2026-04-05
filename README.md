# Bokacourt App

A vanilla JS + Supabase scaffold for the Bokacourt flow described in the architecture notes.

## Structure
- public/               Static site pages
- public/assets/css/    Styles
- public/assets/js/     Client logic
- supabase/migrations/  SQL migrations

## Setup
1) Create a Supabase project.
2) Run SQL migrations in this order:
	- supabase/migrations/001_init.sql
	- supabase/migrations/002_security_hardening.sql
	- supabase/migrations/003_fix_rls_recursion.sql
	- supabase/migrations/004_game_lifecycle.sql
	- supabase/migrations/005_event_location_notes.sql
	- supabase/migrations/006_user_roles_and_admin_seed.sql
3) For local dev, set your keys in public/assets/js/env.js.
4) Keep real credentials out of git (public/assets/js/env.js is in .gitignore).
5) Serve the public/ folder with a static server (VS Code Live Server works well).

## Netlify Deployment
1) Set Netlify environment variables:
	- SUPABASE_URL
	- SUPABASE_ANON_KEY
2) This repository includes `netlify.toml` with:
	- Build command that injects those variables into `public/assets/js/env.js`
	- Publish directory set to `public`
3) In Supabase Auth settings, add your Netlify site URL to Site URL and add redirect URLs for your domain.
4) Trigger a deploy from Netlify (or connect the Git repository for automatic deploys).

## Automatic Supabase Migrations (GitHub Actions)
1) The workflow file is at .github/workflows/supabase-migrations.yml.
2) It runs automatically on push to main or master when files under supabase/migrations/ change.
3) It can also be run manually from the GitHub Actions tab (workflow_dispatch).
4) Configure this required GitHub secret:
	- SUPABASE_DB_URL
5) Expected format:
	- postgres://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
	- If the password contains special characters, URL-encode them (for example `@` -> `%40`).
6) Recommended: protect main branch and require pull request review before merge.

## Notes
- The migration includes a basic trigger to create a user_profiles row on signup.
- RLS has been hardened in 002 and recursion-safe fixes were added in 003.
- Notifications are a placeholder module for now.

## Current UX Flow (March 2026)
- Navbar primary entry is `Upcoming` (dashboard).
- `Bokacourt` brand click routes to `/dashboard.html`.
- Group management is simplified to create-only UI on `/group.html`.
- Manual join by typing invite token has been removed from UI.
- Event sharing is done through per-event invite links (shared from event cards).

## Troubleshooting
- If you see `42P17 infinite recursion detected in policy for relation "group_members"`, run `supabase/migrations/003_fix_rls_recursion.sql`.

## Commit Checklist
1) Confirm `public/assets/js/config.js` does not contain hardcoded Supabase keys.
2) Confirm your database has migrations 001, 002, 003, 004, 005, and 006 applied.
3) Confirm `public/assets/js/env.js` is ignored by git and not committed with real secrets.
4) Confirm GitHub repository secrets for migration automation are configured.

