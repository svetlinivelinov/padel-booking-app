# Bokacourt App

A vanilla JS + Supabase scaffold for the Bokacourt flow described in the architecture notes.

## Structure
- public/               Static site pages
- public/assets/css/    Styles
- public/assets/js/     Client logic
- supabase/migrations/  SQL migrations

## Setup
1) Create a Supabase project.
2) Run the migration in supabase/migrations/001_init.sql.
3) For local dev, set your keys in public/assets/js/env.js (or in config.js).
4) Serve the public/ folder with a static server (VS Code Live Server works well).

## Netlify Deployment
1) Set Netlify environment variables:
	- SUPABASE_URL
	- SUPABASE_ANON_KEY
2) Build command:
	echo "window.SUPABASE_URL='$SUPABASE_URL'; window.SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY';" > public/assets/js/env.js
3) Publish directory: public
4) In Supabase Auth settings, add your Netlify site URL to Site URL and add redirect URLs for your domain.

## Notes
- The migration includes a basic trigger to create a user_profiles row on signup.
- RLS policies are intentionally minimal; tighten them before production use.
- Notifications are a placeholder module for now.

