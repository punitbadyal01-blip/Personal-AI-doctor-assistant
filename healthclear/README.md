# Supabase update — HealthClear 1.3

Optional cloud accounts and private saved report text are implemented. Setup: [Supabase guide](supabase/README.md). Supabase project credentials and migration are required; they are not bundled. Install the new `HealthClear-1.3.apk` from the releases folder.

# HealthClear 1.3

Installable Android app by Punit Badyal, with a local interface and native Android integrations. Android 8+; compile/target SDK 36. Build and phone-testing instructions are in [backend/SETUP.md](backend/SETUP.md). Open the root `HealthClear.code-workspace` in VS Code.

## Implemented

- JPG/PNG/PDF selection and delegated camera capture, 10 MB validation and original preview.
- Native PDF page rendering; editable extracted text with an explicit verification gate.
- Authenticated server-side OpenAI adapters for written-report extraction, source-linked explanation, English/Hindi/Telugu output and report questions. Provider keys remain on the server.
- Unreadable-text markers, source-line navigation, exact original quotes/measurements and conservative reference-range labels for explicitly formatted numeric ranges with matching units.
- Offline Android speech, pause/resume, replay and speed; long explanations are chunked without adding claims. Audio reads the displayed explanation and source quotes.
- No-save default; explicit Android Keystore-encrypted history for reviewed text and explanations; original files not persisted in history. Deletion and file export.
- Native Back behavior, responsive navigation and Punit Badyal’s developer section.
- Clear separation of fictional examples from configured live processing. No fabricated fallback when a service fails.

## Configuration still required for real AI

Set the server's `OPENAI_API_KEY` and `OPENAI_MODEL`, run/deploy the included backend, then connect the app in Settings. This repository ships no AI credentials. Without configuration, examples work offline and personal files can be viewed/reviewed but cannot receive live AI analysis.

The backend has no report database, user accounts, cloud synchronization or account-deletion endpoint; it keeps report processing transient. Local saved reports can be deleted. This is a personal prototype, not a clinically validated product. No regulatory or medical-certification claim is made. OCR/model outputs and translation need human review. Numeric range badges are only computed when the exact explicit format can be parsed safely; other values retain their source quotes without an automatic range classification.

## Build

From the repository root:

    powershell -File healthclear/android/build-apk.ps1 -SdkPath D:/android -JavaPath "C:/Program Files/Java/jdk-24"

For USB backend testing add `-Development`; it writes `HealthClear-dev.apk` and only permits loopback HTTP at `http://127.0.0.1:8080`. The regular `HealthClear-1.3.apk` requires HTTPS. Both use the same local development signing key so updates can retain app data. The key remains ignored under `android/build-direct`; preserve it privately. This is not Play Store release signing.

Open `android/` in Android Studio for the Gradle project (AGP 8.13, compile SDK 36, Java 17 language level). VS Code uses the supplied standalone SDK build script without requiring Gradle downloads. `releases/SHA256SUMS.txt` records the APK hashes.

## Code map

- `dist/app.js`, `style.css`: screens, review flow, history and source navigation.
- `dist/api.js`: backend configuration, native/browser requests, normalization and conservative range comparisons.
- `dist/services.js`: fictional fixtures, language labels, file validation and exact audio text.
- `backend/server.mjs`: authenticated, bounded, stateless processing API and source validation.
- `android/.../MainActivity.java`: file/camera/PDF, native HTTP bridge, speech and export.
- `android/.../SecureStore.java`: authenticated encryption backed by Android Keystore.
- `android/test-src`: separate instrumentation tests, not packaged in the application.

## Verification limits

Unit/API tests use mocked provider responses and check validation, auth, consent, error sanitization, source references, numeric preservation, uncertainty, file types, range labels and audio text. Android instrumentation tests run against a test-only fictional provider to check native transport and UI flows. They do not establish accuracy of live OCR, translation or medical explanations. Camera hardware, OEM installation restrictions and speech voices require testing on the target phone. No clinician validation has been performed.
