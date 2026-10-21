# Supabase update — HealthClear 1.3

Optional cloud accounts and private saved report text are implemented. Setup: [Supabase guide](healthclear/supabase/README.md). Supabase project credentials and migration are required; they are not bundled. Install the new `HealthClear-1.3.apk` from the releases folder.

# HealthClear for Android

Created by **Punit Badyal** · [GitHub](https://github.com/punitbadyal01-blip)

HealthClear explains **written** blood-test, X-ray and ultrasound reports in English, Hindi and Telugu. It is an Android app with a bundled local interface and native camera, PDF viewer, text-to-speech, encrypted history and file export.

## Install on a phone

[Download HealthClear 1.3 APK](healthclear/releases/HealthClear-1.3.apk?raw=true)

Requires Android 8.0 or newer. Download the APK itself (not the repository ZIP or an HTML page), then open it on your phone. If an Android installation error appears, keep the exact message. The USB install task below gives a more useful diagnostic without erasing existing app data.

## Run from VS Code

Open **HealthClear.code-workspace**. Use **Terminal → Run Task**:

1. **HealthClear: Tests**
2. **HealthClear: Start backend** (configure the ignored `.env` first for real AI)
3. Connect and authorize your USB-debugging-enabled Android phone.
4. **HealthClear: Install and run on USB phone**

The phone task builds a separate development APK and forwards port 8080 over USB. In the development app’s Settings use `http://127.0.0.1:8080` and the backend access token from your local `.env`. This loopback-only HTTP connection is disabled in the regular APK. The regular APK requires an HTTPS backend.

## Real processing requires configuration

Fictional examples work offline. Personal report extraction, explanation, translation and chat use the included authenticated backend and require a server-side OpenAI API key and a supported model. No provider credential is included. No simulated output is substituted for a failed live request.

[Backend setup and phone testing](healthclear/backend/SETUP.md) · [Features, architecture and limitations](healthclear/README.md)

The APK is signed for development/testing. It is not a clinical device, a Play Store release, or a claim of regulatory approval.
