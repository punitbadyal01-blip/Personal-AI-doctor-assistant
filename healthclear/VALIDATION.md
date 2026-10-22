# Supabase update verification — 22 October 2026

- 33 automated tests pass: 16 existing medical/report tests and 17 Supabase adapter/API tests with mocked responses, including Google PKCE flow and invalid configuration handling.
- Regular HealthClear 1.4 APK built; v2/v3 signatures and ZIP alignment verified. Development APK rebuilt separately.
- Live Supabase verification passed: owner read/insert/delete, two-user isolation, anonymous denial, forged-ownership denial and denial of another user's deletion. Temporary fictional test users were removed after the test.
- Live backend-to-Supabase verification passed: sign-in, explicit saving consent, save/list/open/delete, deleted-report denial, account deletion with report cascading, and rejection of the deleted account session. The temporary backend verification account was removed.
- Supabase project configuration is stored only in the ignored local backend/.env. Configuration readiness reflects key presence/type; the live tests above separately verified connectivity and access policies.
- New cloud screens have not been visually verified: the browser automation kernel failed to start because of a Windows sandbox setup error. Target-phone installation and end-to-end cloud interaction remain unverified.
- Connected Supabase security advisor returned no issues. Database catalog checks confirmed RLS enabled, owner-only policies, cascading account deletion, no anonymous SELECT grant and no authenticated UPDATE grant.
- Release APK assets match the current source byte for byte; Google sign-in bridge is packaged. APK checksums, v2/v3 signatures and ZIP alignment verified.
- Phone installer now selects version 1.4 for regular installs and reports launch timeouts separately from installation success. VS Code Tests includes the cloud suite.
- No live AI provider verification or production deployment is claimed. Existing phone/emulator limitations below remain relevant.

Google provider is disabled on the connected project. Google OAuth consent, external-browser return and phone installation remain unverified. No phone was attached during the 1.4 build. Provider activation instructions are in supabase/GOOGLE_SIGN_IN.md.

## Previous verification record

# Verification — 14 October 2026

## Passed

- 16 automated unit/API tests (mocked provider; no live patient data/API calls).
- Java/resource compilation and DEX packaging.
- Regular and development APK signature verification and ZIP alignment.
- Android emulator installation of the previous APK and updated development APK.
- Updated app launch on the Android 36.1 emulator.
- Earlier instrumentation run reached review verification, explanations, source links, Hindi/Telugu, encrypted history, developer section, native backend connection and mocked OCR/explanation. Its chat check failed due to a test selector, subsequently corrected.
- VS Code workspace opens; local actual backend starts and `/health` responds.

## Incomplete / not claimed

The final full instrumentation run did not pass: this emulator intermittently disconnected and a WebView JavaScript callback timed out. A later bounded run reached upload, responsive-width and review checks before that timeout. Do not treat the entire Android flow as verified. Run the included checks on the target phone and record the exact installation/runtime error if any.

No physical phone was connected during these checks. Camera hardware, offline voice availability and Redmi-specific installation behavior remain untested. No live provider call was made because OPENAI_API_KEY and OPENAI_MODEL are not configured. Successful mocked tests do not establish real OCR, translation, clinical accuracy or production readiness.

The normal backend uses `server.mjs`. `fixture-server.mjs` is only for fictional automated tests and must not be used as the normal service.
