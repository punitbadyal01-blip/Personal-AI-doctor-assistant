For Google quick sign-in, see [Google setup](GOOGLE_SIGN_IN.md). No Firebase is used.

# Supabase setup for HealthClear 1.5

Cloud integration is implemented, but no Supabase project or credentials are included. You must create your project and apply the migration before cloud accounts work. The Android app still supports fictional samples offline and local encrypted history.

## Connect your project

1. Create a Supabase project at https://supabase.com/dashboard. Choose the region and backup/retention settings appropriate for your data.
2. In the SQL Editor, run `migrations/202610210001_reports.sql` once. It creates the reports table, ownership foreign key, and row-level security policies. Never disable RLS.
3. In Authentication, enable email/password sign-in and email confirmation. Configure your own SMTP for reliable confirmation delivery. Set the Auth Site URL to a page you control so confirmation links have a usable destination. Users confirm in email, then return to the app to sign in.
4. In project API settings, copy the project URL, publishable key, and secret key to **healthclear/backend/.env** on your computer/server:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SECRET_KEY=your_server_secret_key
   ```

   Legacy anon/service_role keys are also supported in the corresponding variables. Never put the secret key in the Android app, repository, screenshots, or chat. Keep the existing `HEALTHCLEAR_ACCESS_TOKEN`; it protects this personal backend. AI provider settings are separate and still required for extraction/explanation.
5. Restart the backend (`npm run backend` from `healthclear`). In Android Settings, connect the backend address and access token; the readiness result reports AI and Supabase separately. A configured status checks settings presence, not a successful database round trip.
6. Create your cloud account in Settings, confirm your email, then sign in. After reviewing a personal report, choose **Save text to cloud**, read the notice, and confirm. My Reports has separate local and cloud sections.

## Phone installation

Use `releases/HealthClear-1.5.apk` for a deployed HTTPS backend. GitHub hosts the APK and source; it does not run your Node backend or Supabase project. For local USB testing, use `HealthClear-dev.apk` and the VS Code install task with `adb reverse tcp:8080 tcp:8080`. The local development address is `http://127.0.0.1:8080`.

## Data and access

- Only explicitly saved reviewed text, filename, language and timestamp are stored. Original images/PDFs and generated explanations are not stored in Supabase. Reopen cloud text to review and generate a fresh explanation with new processing consent.
- Auth session tokens stay only in app memory. There is no background refresh: sign in again after session expiry. Supabase's default Auth expiry applies. Server checks the current user through Auth before every cloud operation.
- Every report query uses the user's JWT plus the publishable key, so RLS enforces ownership even if a report ID is guessed. Users cannot change ownership or update records through the table API.
- The secret/admin key is used only for deleting the currently authenticated account. The database foreign key cascades report deletion. Local saved reports and exported copies are separate and must be deleted separately.
- Deletion removes active records; backups follow your Supabase project's retention settings. Do not claim immediate erasure from all provider backups. Review provider retention and privacy settings before real medical data use.
- This remains a personal backend protected by a shared backend access token, not a public multi-tenant production deployment. Do not publish that token or open the backend without access control. No compliance certification is claimed.
- Android password recovery uses the email link and PKCE app callback. Configure SMTP and allow com.healthclear.app://auth/callback under Redirect URLs. Keep the app running and open the email link on that phone within ten minutes. Delivery and a real recovery-email callback remain unverified; authenticated password changes passed live tests. Public release also needs abuse protection, email deliverability, production signing, and device/clinical review.

## Verification

`npm test` runs mocked authentication/ownership/consent/deletion and existing medical-safety tests. `npm run test:supabase` runs actual RLS isolation checks against your configured project using two temporary fictional test users, then deletes those users and their reports. Run it only on your development Supabase project. It never uses real patient data. Passing mocked tests does not prove a deployed project's RLS configuration.

Manual acceptance: create/confirm/login, save a fictional test text as a personal report, restart and sign in again, open/review, decline cloud saving, delete a report, delete the account, verify a different account cannot see its reports, and confirm local history is unaffected. Test missing credentials, wrong password, offline mode, expired sessions, and deletion failure on the physical Redmi.

References: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API keys](https://supabase.com/docs/guides/api/api-keys), [User data and deletion](https://supabase.com/docs/guides/auth/managing-user-data).

Apply all files under migrations in order, including `20261023155205_expand_report_languages.sql`. This expands the language constraint while preserving existing reports and owner access policies. The migration is already applied to the connected development project.
