# HealthClear architecture and operation

HealthClear 1.5 keeps the existing stack: Android Java shell, bundled vanilla JavaScript/CSS, Node HTTP backend and Supabase Postgres/Auth. There are no runtime npm dependencies. Playwright is a pinned development-only dependency with a lockfile.

## Modules

- `dist/app.js`: screen orchestration and consent-aware report/account workflows.
- `dist/ui.js`: shared icons, controls, text escaping, focus-managed confirmations and localized form validation.
- `dist/i18n.js`, `dist/locale-{en,hi,te}.js`: complete interface catalogs, safe preferences, theme application, localized dates and errors. Add a complete catalog and language metadata before exposing another language. RTL languages are not shipped.
- `dist/languages.js`, `dist/language-picker.js`: shared report-language validation, 184 base language choices, regional tags and searchable picker with RTL handling.
- `server.mjs`: laptop-only gateway with automatic connection, strict local Host/Origin checks and no exposed backend token.
- `dist/history.js`: validates whole saved collections, preserving corrupt data instead of silently dropping entries.
- `dist/api.js`: backend configuration, native/browser transport, cancellation on connection changes, session expiry, exact quotes and conservative range formatting.
- `dist/services.js`: explicitly fictional sample reports and medical explanation text in three languages, file validation and exact audio composition. The active personal-report OCR adapter is `api.extract`, backed by the server.
- `backend/server.mjs`: bounded, authenticated analysis endpoints, processing consent, source/output validation, exact-origin CORS and sanitized failures.
- `backend/cloud.mjs`: Supabase Auth, PKCE Google/recovery exchanges, user-JWT report operations, validated search/sort/pagination, idempotent saves and confirmed account deletion.
- `android/.../MainActivity.java`: private camera/document/PDF handling, API bridge, auth links, offline TTS, appearance/insets and summary export.
- `android/.../SecureStore.java`: Android Keystore AES-GCM encryption for explicitly saved local history.

## Data flow and retention

No-save is the default. Personal files require processing consent and text verification before analysis. OCR output preserves uncertain characters as `[unreadable]`; the user must obtain a clearer report instead of guessing. Actual scan images without a written report are refused. Claims link to exact source lines, and values/units remain in their original form.

Explicit local saves keep reviewed text/explanations encrypted on Android. Browser preview stores only sample references. Cloud saves keep reviewed text, filename, language and timestamp under owner-only RLS; original files and generated explanations are not stored in Supabase. Cloud report reopening requires new processing consent for new AI requests. Account deletion revokes sessions and cascades owned report deletion. Provider backups follow the project's retention settings.

Backend and user-session tokens stay in memory. API keys and Supabase admin secrets remain server-side. Connection changes cancel pending client promises, and stale responses cannot establish a replacement session. Passwords/tokens/report text are not logged. OpenAI and Gemini adapters request `store:false`; provider retention still applies. Gemini personal processing also requires the administrator to confirm paid-service billing in the backend configuration; unpaid Gemini services must not receive personal reports. See [provider setup](backend/SETUP.md).

Translations are cached only in the current report's memory and are discarded when leaving it. Android and browser playback select local voices; missing voices produce a readable fallback. Exported summaries are plaintext copies deliberately chosen by the user.

## Build

From the repository root:

```powershell
powershell -File healthclear/android/build-apk.ps1 -SdkPath D:/android -JavaPath "C:/Program Files/Java/jdk-24"
```

Add `-Development` for `HealthClear-dev.apk`. The regular `HealthClear-1.5.1.apk` requires HTTPS; the development APK permits only `http://127.0.0.1:8080`. Preserve the ignored signing key privately to retain update compatibility. This key is for development/testing, not a Play Store production signing setup.

[Setup and deployment](backend/SETUP.md) · [Supabase](supabase/README.md) · [Google](supabase/GOOGLE_SIGN_IN.md) · [Review](IMPLEMENTATION_REVIEW.md) · [Verification](VALIDATION.md)
