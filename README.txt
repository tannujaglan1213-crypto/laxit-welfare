LAXIT WELFARE FOUNDATION WEBSITE

The site remains static, but Supabase provides the database and administrator sign-in.
After setup, foundation administrators can add, edit, publish, close, and delete events at
admin.html. Public event registrations are saved in Supabase and are visible only to
authorized foundation administrators.

ONE-TIME SUPABASE SETUP
1. Create a Supabase project at https://supabase.com/.
2. In the project's SQL Editor, run the complete supabase-schema.sql file.
   This creates the events and registrations tables, access policies, and the initial
   Education Paper Prize Distribution event.
3. In Supabase Authentication, create/invite each administrator with an email and password.
   For each administrator, find their user UUID in Authentication > Users, then run:

   insert into public.foundation_admins (user_id)
   values ('PASTE-USER-UUID-HERE');

   Only UUIDs added to foundation_admins can manage events or see registration data.
   Disable public sign-ups in Authentication settings; invite/create administrator accounts
   yourself. Do not add a service-role key to any website file.
4. In Project Settings > API, copy the Project URL and the publishable key (or legacy anon
   key). Put them in js/config.js as supabaseUrl and supabaseAnonKey.
   The publishable/anon key is intended for browser use; the SQL policies protect the data.
5. Publish the entire website folder using your hosting provider. The site should be served
   over HTTPS. Open admin.html and sign in with an authorized account.

USING THE ADMIN PAGE
- Create an event with its date, category, venue, and description.
- Edit an event to update its details, close registrations, or unpublish it.
- Delete an event when needed. Existing registration records remain available and retain
  their event title and date.
- Registrations appear in the dashboard after a visitor submits the registration form.
  The foundation can contact registrants using the details shown there.
- Registration fees are hidden and set to zero by default. To enable fees later, set
  registrationFeesEnabled to true in js/config.js. The admin fee field and visitor payment
  prompts will then appear.

Visitors must still send their registration via WhatsApp or email for the foundation to
confirm their seat. Supabase saves their details automatically when configured. Without
Supabase settings, the site falls back to the local sample event and does not save
registrations automatically; the existing WhatsApp/email handoff remains available.

OTHER FILES
index.html       Public website content and contact details.
admin.html       Administrator sign-in and event/registration dashboard.
css/style.css    Website styles.
js/config.js     Contact details, Supabase project URL and public key, local fallback event.
js/main.js       Public event display and registration form.
js/admin.js      Admin login and event management.
supabase-schema.sql   Database tables, admin access controls, and initial event.
