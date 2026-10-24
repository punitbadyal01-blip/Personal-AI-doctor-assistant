# HealthClear 1.5.1 for Android

By **Punit Badyal** · [Developer](https://github.com/punitbadyal01-blip)

Understand written blood-test, X-ray and ultrasound reports with source-linked AI explanations. Choose from 184 base report languages and regional variants; model quality and local speech availability vary. Menus and offline fictional examples are fully supplied in English, Hindi and Telugu. HealthClear is an installable Android app with a bundled interface, native camera/PDF viewing, offline device speech, encrypted local history and optional private Supabase accounts. It does not interpret actual scan images or make diagnoses.

**[Download HealthClear 1.5.1 APK](https://github.com/punitbadyal01-blip/Personal-AI-doctor-assistant/releases/download/v1.5.1/HealthClear-1.5.1.apk)** · [Release page](https://github.com/punitbadyal01-blip/Personal-AI-doctor-assistant/releases/tag/v1.5.1)

Use Chrome on your phone and choose the APK under Assets if an in-app browser cannot download it. Android 8+ is required. The regular APK needs an HTTPS backend for online features; GitHub distributes the installer and does not run the backend. Fictional samples work offline.

## Upload reliability fix

The app checks AI service configuration before sending a personal report. A missing provider setup leaves you on Upload with a clear explanation. Empty or unreadable OCR text cannot be verified or analysed, and successful retries clear old errors. Sample screens omit unavailable live-chat and cloud-save actions.

## What changed

- Compact mobile navigation and complete upload, review, explanation, history, settings and account screens.
- Searchable AI report languages, regional codes and RTL explanations; English, Hindi and Telugu interface catalogs, remembered preferences, light/dark/system appearance and larger text.
- Search, filters, sorting, confirmations, local duplicate prevention and safe handling of unreadable saved data.
- Source-linked findings, conservative reference-range labels, consent gates, summary export and offline voice controls.
- Optional Supabase sign-in, private cloud search/pagination, idempotent saves, password recovery integration and account deletion.
- Report conversation with source citations and bounded, in-memory question history.
- Automatic local browser connection; developer setup is collapsed.
- Accessible form errors, keyboard focus, offline feedback and responses that cannot overwrite a newer session.

[Implementation review and limitations](healthclear/IMPLEMENTATION_REVIEW.md) · [Actual test results](healthclear/VALIDATION.md)

## Run locally in VS Code

For a one-command laptop preview, run `powershell -NoProfile -ExecutionPolicy Bypass -File healthclear/start-laptop.ps1`, or use **Terminal → Run Task → HealthClear: Start laptop preview** in VS Code. [Laptop testing guide](healthclear/LAPTOP_TESTING.md).

Tested with Node.js 24 on Windows. For separate terminals, from this repository:

```powershell
npm --prefix healthclear ci
npm --prefix healthclear run backend
```

Configure `healthclear/backend/.env` first using `.env.example`. Do not commit secrets. Your existing local Supabase configuration is preserved.

For the interface preview, in another terminal:

```powershell
npm --prefix healthclear start
```

Open http://127.0.0.1:5173. Local browser connections to http://127.0.0.1:8080 also require `HEALTHCLEAR_ALLOWED_ORIGINS=http://127.0.0.1:5173` in the backend environment. The regular Android APK still requires HTTPS.

For the laptop Android emulator, run **Terminal → Run Task → HealthClear: Run Android emulator**. It builds and opens the development APK in the local virtual device.

For the phone, enable USB debugging, connect a data cable, and open `HealthClear.code-workspace`. Run **Terminal → Run Task → HealthClear: Install and run on USB phone**. It builds the development APK and forwards backend port 8080. In that app's Settings, use `http://127.0.0.1:8080` and the backend access token from your local `.env`.

## Verify

```powershell
npm --prefix healthclear run check
npm --prefix healthclear test
npm --prefix healthclear run test:ui
```

Browser tests use Microsoft Edge on Windows; on other systems install Playwright Chromium and select it in `playwright.config.js`. Browser provider responses are explicitly fictional and are intercepted only in tests. `test:cloud` and `test:supabase` use temporary fictional accounts on your configured development Supabase project, then remove them.

## External setup still required

- **Real AI:** select OpenAI or Google Gemini in the server-side configuration. Gemini uses `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` and a confirmed paid-service declaration. OpenAI uses `OPENAI_API_KEY` and `OPENAI_MODEL`. See [backend setup](healthclear/backend/SETUP.md). Missing settings never produce simulated analysis.
- **Cloud:** Supabase URL, publishable key, server-only secret key and the supplied migration. The existing connected database passed live ownership checks.
- **Google sign-in:** enable/configure the Supabase Google provider with your Google OAuth credentials. No Firebase is used.
- **Recovery email:** configure reliable SMTP and allow `com.healthclear.app://auth/callback` in Supabase Redirect URLs. The recovery exchange is implemented; actual email delivery has not been verified.
- **Use without USB:** deploy the Node backend behind HTTPS. [Deployment and environment guide](healthclear/backend/SETUP.md).

This is a verified development build for controlled testing. Production signing, physical-device acceptance, operational safeguards and clinical/native-speaker review remain separate requirements. No compliance or certification claim is made.
