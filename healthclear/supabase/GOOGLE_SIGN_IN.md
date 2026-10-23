# Google sign-in through Supabase (HealthClear 1.5)

The Android app contains a **Continue with Google** button. It opens the device browser and returns to HealthClear through a PKCE-protected authorization-code flow. The app uses the same Supabase accounts and private report table as email sign-in. No Firebase project, SDK or configuration is used.

## Current status

The Supabase database and backend email-account/report operations passed live verification. Google is disabled on the connected project as of the last check. Google OAuth client creation and provider activation require access to the owner's Google Cloud and Supabase dashboards. The available database API keys cannot create Google OAuth credentials or change project Auth configuration. Do not describe Google sign-in as working until configuration and an actual account sign-in pass.

## One-time account configuration

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview). Create or select your Google Cloud project. Configure the consent screen with your app name, support email and audience. While the OAuth app is in Testing, add the Google accounts that will test HealthClear as test users.
2. Create an OAuth client of type **Web application**. This app uses browser-based OAuth through Supabase; the Google callback is a web address.
3. Set its authorized redirect URI to:

   ```text
   https://yirlspoowwputxcjctxe.supabase.co/auth/v1/callback
   ```

4. In [Supabase Google provider settings](https://supabase.com/dashboard/project/yirlspoowwputxcjctxe/auth/providers?provider=Google), enable Google and enter the web client ID and client secret from Google. Save. Keep the client secret only in Supabase; it is not needed in `.env`, the APK or GitHub.
5. In [Supabase URL Configuration](https://supabase.com/dashboard/project/yirlspoowwputxcjctxe/auth/url-configuration), add this **Additional Redirect URL** exactly:

   ```text
   com.healthclear.app://auth/callback
   ```

6. Install `HealthClear-1.5.apk` (HTTPS backend) or `HealthClear-dev.apk` (local USB backend). Connect the backend in Settings, then tap **Continue with Google**. Choose your Google account and return to HealthClear. Check My Reports with a fictional test report before using personal data.

For another Supabase project, use that project's `/auth/v1/callback` URL in Google. The Android return URL stays the same.

## Behavior and checks

- The backend checks that Google is enabled before opening the browser. Disabled provider, network failure, denied consent, invalid callback, missing browser and expired/interrupted sign-in all produce readable retry messages. Email sign-in remains available.
- A random per-attempt verifier produces an S256 PKCE challenge. Only the challenge is sent in the browser URL. The app retains the verifier in memory for up to ten minutes; no tokens, report text or backend credentials are placed in that URL.
- The exported Android callback accepts only the exact app scheme, host and path, requires an active sign-in attempt, and passes the one-time authorization code to the backend for exchange. Unexpected callbacks cannot establish a session. Cancelling or starting email sign-in clears the pending Google attempt.
- App process death clears the pending verifier and backend access token; start sign-in again after reconnecting. Sessions remain in memory, as with email sign-in. There is no session auto-refresh.
- Google tokens and OAuth client secrets are not embedded in the APK. Supabase performs provider verification and issues the user session. RLS still enforces report ownership using the Supabase user JWT.
- Unit tests cover disabled provider, random verifier/challenge binding, fixed return URL, code exchange, invalid callbacks and incomplete exchange responses. An actual Google consent and Android callback round trip has not been verified. No phone was connected during the build.

See the current official [Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE flow guide](https://supabase.com/docs/guides/auth/sessions/pkce-flow), and [mobile deep-linking guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
