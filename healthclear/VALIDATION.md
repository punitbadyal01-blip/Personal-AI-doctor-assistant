# Gemini source update — 24 October 2026

- Added explicit server-side OpenAI/Gemini selection, Gemini inline JPEG/PNG/PDF inputs and structured explanations/chat. Responses still pass the shared source, measurement, negation and uncertainty guards. Blocked/truncated/malformed responses fail without invented output; errors never echo provider payloads.
- User confirmed billing is not set up. The ignored local configuration selects Gemini with `GEMINI_PAID_SERVICE=false`; personal processing stays disabled. The app explains free testing mode before sending a file. The optional `npm run test:gemini` command accepts no user report input and sends only its fixed fictional text.
- 57 unit/API tests passed, including six Gemini-specific tests. Eight unique browser cases passed across the OCR-recovery and online suites; all five OCR-recovery cases were rerun after the free-mode notice was added. Syntax and whitespace checks passed.
- Gemini key and model were absent at verification. No live Gemini call was made, billing was not enabled, and no personal report was sent. The published 1.5.1 APK is unchanged by this source update; rebuild Android assets before distributing the updated consent notices.

# HealthClear 1.5.1 — 24 October 2026

- Fixed the uploaded-image/blank-text dead end: AI configuration is checked before the file is sent. An unavailable service leaves the user on Upload with a clear explanation.
- Blank, unreadable and scan-only review states cannot be marked verified or analysed. OCR failures appear beside the actions, and a successful retry clears stale errors and requires fresh verification.
- Removed unavailable sample chat/cloud-save actions, browser-only unsupported personal local-save actions, repeated summary source links and unused placeholder adapters. Per-finding citations, sample questions, export, cloud account and native saving remain.
- 51 unit/API tests passed. Ten targeted browser checks passed, including missing configuration (zero OCR requests), JPEG/JFIF upload handling, empty OCR, failed-then-successful retry, edit guards, sample controls, three UI languages and the mocked online/cloud conversation flow.
- This patch does not enable an AI provider: the local API key/model were still absent at verification. No personal medical report was submitted to a provider. Real OCR/explanation, physical phone acceptance and live model translation accuracy remain unverified.

# HealthClear 1.5 verification — 23 October 2026

- Syntax checks passed with `npm run check`.
- 51 Node unit/API tests passed, covering medical safety/source preservation, locales, history integrity, local/production transport restrictions, Supabase operations, recovery, idempotency and backwards-compatible pagination.
- Before the final clean-UI refinement, 67 unique browser cases passed across executed suites: 60 width/language/theme cases plus seven functional/accessibility/online cases. All ten requested widths (320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440) were exercised through upload/review/results/history/settings in English/Hindi/Telugu and light/dark. Relevant checks were rerun after final draft/form changes. No horizontal overflow was found in those checks. Large-text settings, preserved units/source links, duplicate samples, search, dialog cancellation, keyboard skip/focus, preferences, original-text export, offline feedback, localized validation and text contrast were checked.
- After the clean-UI refinement, 14 targeted browser cases passed: 320px English, 375px Hindi/Telugu and 1440px English in light/dark, plus keyboard/forms, multilingual picker/regional codes, mocked Arabic conversation/source/cache/cloud flow, confirmation/offline handling and text contrast. The final laptop screenshots showed no overflow or browser errors.
- Browser provider responses were fictional and intercepted only inside the test process. Mocked online cases verified consent, review, cached translation requests, cloud idempotency request IDs and session expiry; these do not prove live OCR/AI accuracy.
- Live Node-backend-to-Supabase checks passed: two-user sign-in, consent, idempotent saves and conflict rejection, search/sort, isolation, authenticated password change and login, report deletion, account cascade and deleted-session rejection. Temporary fictional accounts were cleaned up. No real patient data was used.
- Supabase security and performance advisors returned no issues after the language migration. The language constraint now accepts bounded language tags; owner RLS remains intact. Live tests saved and reopened an Arabic-language report, and verified two-user isolation and deletion.
- Searchable language picker and regional code validation passed browser tests. Mocked Arabic explanations rendered right-to-left; a two-question conversation preserved context and source links. Local gateway security tests passed; actual laptop preview connected automatically with 189 selector options and no browser errors. AI key and model were still absent, so no real AI output was verified.
- Regular and development APKs compiled and passed v2/v3 signature and alignment verification. Bundled assets were compared byte for byte with source.
- Version 1.5 installed on Android 36.1. Native UI instrumentation passed upload, no horizontal overflow, text verification, explanations, source links, Hindi/Telugu, encrypted saved history/reopen and developer details. A real blank-screen issue was fixed by packaging locale modules as flat assets; modules now load in Android. Physical Redmi testing is still pending. The emulator sometimes displays a System UI ANR on this laptop; that is an emulator limitation.
- Full fixture-dependent native instrumentation was not run because starting the test-only provider was declined. Camera hardware, real offline voices, actual recovery email, Google consent and live AI remain unverified.
- The AI key/model and Google provider remained unconfigured at the latest check. No production backend deployment, clinical certification or regulatory compliance is claimed.

## Earlier verification records

# Supabase update verification — 22 October 2026

- 33 automated tests pass: 16 existing medical/report tests and 17 Supabase adapter/API tests with mocked responses, including Google PKCE flow and invalid configuration handling.
- Regular HealthClear 1.4 APK built; v2/v3 signatures and ZIP alignment verified. Development APK rebuilt separately.
- Live Supabase verification passed: owner read/insert/delete, two-user isolation, anonymous denial, forged-ownership denial and denial of another user's deletion. Temporary fictional test users were removed after the test.
- Live backend-to-Supabase verification passed: sign-in, explicit saving consent, save/list/open/delete, deleted-report denial, account deletion with report cascading, and rejection of the deleted account session. The temporary backend verification account was removed.
- Supabase project configuration is stored only in the ignored local backend/.env. Configuration readiness reflects key presence/type; the live tests above separately verified connectivity and access policies.
- New cloud screens have not been visually verified: the browser automation kernel failed to start because of a Windows sandbox setup error. Target-phone installation and end-to-end cloud interaction remain unverified. The GitHub APK subsequently passed the emulator installation check recorded below.
- Connected Supabase security advisor returned no issues. Database catalog checks confirmed RLS enabled, owner-only policies, cascading account deletion, no anonymous SELECT grant and no authenticated UPDATE grant.
- Release APK assets match the current source byte for byte; Google sign-in bridge is packaged. APK checksums, v2/v3 signatures and ZIP alignment verified.
- Phone installer now selects version 1.4 for regular installs and reports launch timeouts separately from installation success. VS Code Tests includes the cloud suite.
- No live AI provider verification or production deployment is claimed. Existing phone/emulator limitations below remain relevant.

Google provider is disabled on the connected project. Google OAuth consent, external-browser return and physical-phone installation remain unverified. No phone was attached during the 1.4 build. Provider activation instructions are in supabase/GOOGLE_SIGN_IN.md.

## GitHub APK installation check — 22 October 2026

- Downloaded HealthClear-1.4.apk from the exact GitHub raw link supplied to the user. SHA-256 matches the verified release: fcd4b12c0074e4d72bd5c463e01e29e0449b89e82e165f7ef12e01f9bc174dfc.
- APK v2/v3 signatures and ZIP alignment pass. Package com.healthclear.app, versionCode 5, versionName 1.4, minSdk 26, targetSdk 36. No native CPU-specific library restriction is declared.
- Actual update installation of that downloaded APK on the Android 36.1 x86_64 emulator returned Success. Android package manager confirms version 1.4 (5).
- The launch wait command timed out on this slow emulator; a subsequent activity check confirmed MainActivity as the focused, top resumed activity. No HealthClear crash appeared in the inspected crash buffer. A captured screenshot showed the HealthClear upload screen rendered, with a separate Pixel Launcher not-responding dialog over it. This does not verify every UI flow.
- Initial installation attempts were rejected because the emulator was still booting; the same unchanged APK installed successfully after boot completion.
- No physical phone was connected. Redmi-specific installation settings and runtime behavior still need direct testing. Do not automatically uninstall an existing app or erase its data to resolve an installation error.

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
