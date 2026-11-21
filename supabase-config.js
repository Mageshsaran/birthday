/* ============================================================
   Birthday Studio — Supabase connection settings
   ------------------------------------------------------------
   1. Open your Supabase project → Project Settings → API.
   2. Copy the "Project URL" and the "anon public" / "publishable"
      key (`sb_publishable_...`) into the two fields below.
   3. Reload admin.html and sign in under
      Settings → Supabase cloud.

   SECURITY
   - The anon key is designed to be public. It is safe here ONLY
     because supabase/schema.sql enables Row Level Security and
     restricts writes to signed-in users.
   - Never put the database password or the "service_role" key in
     this file. Anything in this folder ships to the browser.
   - Disable public sign-ups in Supabase Authentication settings,
     otherwise create only your own admin account.
   ============================================================ */
window.BD_SUPABASE = {
  url: 'https://gkehnzpmypegrniorhyk.supabase.co',
  anonKey: 'sb_publishable_hJFBo7l52NoBDdTkkVrOJQ_mVzfcQKW',
  bucket: 'birthday-media',
  siteId: 'main'
};
