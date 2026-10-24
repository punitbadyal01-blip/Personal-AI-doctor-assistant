# Test HealthClear on your laptop

Open `HealthClear.code-workspace` in VS Code. Choose **Terminal → Run Task → HealthClear: Start laptop preview**. This starts the local backend and interface, then opens http://127.0.0.1:5173 in your browser. It safely reuses running services. Node.js 24 is required; no Android emulator is needed for this preview.

Or run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File healthclear/start-laptop.ps1
```

## Try these flows

1. Choose a **fictional sample report** on Upload. Review its text, check the verification box and continue.
2. Open a source link in the explanation; check the highlighted original value. Switch the explanation between English, Hindi and Telugu.
3. Try audio if your laptop has a local voice for that language. Missing voices show a message; the app does not send report text to a network voice.
4. Save the sample, open My Reports, search for it and reopen it. Test deletion by cancelling the confirmation first.
5. In Settings change the interface language, theme and text size, then reload. Resize the window to check the mobile layout.
6. Try a rejected file type or continue without verifying text to check error messages.

The laptop browser connects automatically through a loopback-only gateway. It never receives your backend access token. Developer connection controls remain collapsed for manual overrides. Supabase is configured locally. Real OCR/explanation requires a configured provider in `backend/.env`: OpenAI key/model, or `AI_PROVIDER=gemini` with `GEMINI_API_KEY`, `GEMINI_MODEL` and a paid-service declaration. See [backend setup](backend/SETUP.md). Restart the backend after editing `.env`; the preview launcher reuses an existing process. Google login requires provider activation. Samples are explicitly fictional and never masquerade as real analysis.

In Settings, use **Browse languages** to search 184 base report languages and regional variants, or enter a code such as `fr-CA`. AI explanations support RTL layout. Offline sample explanations remain explicitly limited to three supplied languages.

## Test the actual Android APK

In VS Code choose **Terminal → Run Task → HealthClear: Run Android emulator**. This rebuilds the development APK, opens the local emulator, waits for Android to boot, installs HealthClear and launches it. Leave the task terminal running while testing; close the emulator window to finish.

The browser previews the same bundled screens but cannot validate Android camera, PDF rendering, encrypted storage or Android speech. Use an Android Studio virtual device for those checks, or your USB phone afterward.

With an emulator running, from the repository root:

```powershell
& 'D:/android/platform-tools/adb.exe' devices
& 'D:/android/platform-tools/adb.exe' -s emulator-5556 install -r healthclear/releases/HealthClear-dev.apk
& 'D:/android/platform-tools/adb.exe' -s emulator-5556 reverse tcp:8080 tcp:8080
& 'D:/android/platform-tools/adb.exe' -s emulator-5556 shell am start -n com.healthclear.app/.MainActivity
```

Replace the SDK path and emulator serial with those on your machine. The development APK permits the loopback backend URL above. The regular `HealthClear-1.5.1.apk` requires an HTTPS backend for online features. Both APKs contain the offline fictional samples.

The ignored local AVD can be started on this laptop with:

```powershell
$env:ANDROID_AVD_HOME = (Resolve-Path healthclear/.test-avd).Path
& 'D:/android/emulator/emulator.exe' -avd HealthClear -port 5556 -no-snapshot -gpu swiftshader_indirect -scale 0.6
```

The AVD is a local development dependency and is not committed to GitHub. A cold boot can take several minutes. If the emulator is slow, use the browser preview while it boots. Real phone camera, voices and installation acceptance still require device testing.
