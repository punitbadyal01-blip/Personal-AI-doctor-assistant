# HealthClear for Android

HealthClear is an installable, offline Android demo app (Android 8.0 / API 26 and above). Its interface is bundled inside the APK; it does not open or depend on a hosted website. Java handles the Android document picker, camera, private PDF rendering, offline text-to-speech, Back navigation and file export. The reusable interface is rendered in a restricted local WebView.

## Install
The verified development APK is in `releases/HealthClear-demo.apk`. Transfer it to your Android phone and open it to install. Android may ask you to allow installation from the app used to open the APK. This is a development-signed demo, not a Play Store release.

Or use a USB-debugging-enabled device:

    adb install -r releases/HealthClear-demo.apk

## Build
Open `android/` as a project in Android Studio. It uses Android Gradle Plugin 8.13.0, compile/target SDK 36, Java 17 language support and no third-party runtime dependencies. Use compatible Gradle 8.13+ with a supported JDK (17 or 21). Android Studio can provide Gradle; no wrapper binary is included.

An offline Windows build script is included and was used to produce the APK with the already installed SDK and JDK 24:

    powershell -ExecutionPolicy Bypass -File android/build-apk.ps1 -SdkPath D:/android -JavaPath "C:/Program Files/Java/jdk-24"

It needs Android platform 36, build-tools 36.1.0, and a JDK with Java 17 compilation support. It compiles resources and Java, runs D8, aligns the APK, signs with a local development key, and verifies signatures. The generated key is under ignored `android/build-direct/`; preserve it if you need compatible updates to an installed demo. Use your own securely managed release signing for distribution.

## What works
- Android document picker for JPG, PNG and PDF up to 10 MB, signature/type validation, and delegated full-size camera capture. No broad storage or camera permission is requested.
- Original image preview and native on-device PDF rendering with Previous/Next page controls.
- Editable text review with explicit verification; unreadable/missing numbers are never guessed.
- Fictional blood-test, written X-ray and written ultrasound samples, with source-linked explanations in English, Hindi and Telugu.
- Android offline text-to-speech with play, pause/resume, replay and speed. Language voices must be installed. Pause resumes at the current word when the selected engine supplies range callbacks; otherwise the current utterance restarts. Audio stops when backgrounded.
- Suggested report questions with grounded prewritten answers.
- Explicit local sample history, deletion and no-save default.
- Doctor-visit summary export through Android's Save dialog.

## Demo limitations
Live OCR, live medical explanations, live translation, free-text AI chat, cloud history and authentication are NOT connected. Personal uploads safely stop at transcription/review. Only unchanged fictional samples can use the prewritten explanations. No account exists, so account deletion is not applicable. Interface navigation is English; explanations are translated. Clinical and native-language human review has not been performed.

## Architecture and future integrations
`dist/services.js` separates OCR, explanation, translation and speech adapters. `dist/app.js` connects the interface to the optional native bridge. `android/app/src/main/java/com/healthclear/app/MainActivity.java` owns device integration; `CameraProvider.java` exposes only a temporary capture file to the chosen camera app. Gradle packages `dist/` as app assets.

For live services, implement authenticated server endpoints with server-only API keys. Revalidate files on the server, isolate parsing, avoid medical-content logs, and require source references with exact values/units and preserved negation/uncertainty. Treat document content as untrusted data, never model instructions. Implement user-owned storage and deletion before enabling real report history. Explain any new transmission/retention and obtain consent before sending personal reports. No clinical or regulatory certification is claimed.

## Privacy
The app has NO INTERNET permission. It blocks external WebView content and accepts only bundled assets at its internal origin. The developer GitHub link opens the system browser, outside the app. No analytics or training collection. Android speech selects offline voices only.

Personal file bytes stay in memory; PDFs and camera captures may temporarily occupy private app cache. Leaving a report or destroying the activity clears those files; after a crash/forced stop, the next app launch clears them. OS memory reclamation is outside the app's control. App backup is disabled. Only fictional sample IDs/languages can be explicitly saved in local WebView storage; users of the same device profile can see them. A summary is written outside private app storage only when the user selects an export destination.

## Verification
Run `node --test tests.mjs` from this folder. Automated checks cover traceability, exact units/ranges, uncertainty/negation, missing/edited/injected text rejection, audio text coverage and invalid file handling. Java/resource compilation, APK packaging and Android signatures are verified by the build script. Device UI, camera, PDF rendering and installed speech engines need testing on an actual phone/emulator; none was available during creation.

Manual device checklist: try all three samples and languages; follow sources; play/pause/replay; export; save/open/delete; pick unreadable images and multipage PDFs; deny/cancel picker/camera; rotate; use Back; background the app during speech; verify airplane-mode behavior. Personal uploads must never show simulated analysis.

The optional `npm start` command runs a desktop UI preview only; it is not needed to use the Android app.

## Developer

Created by **Punit Badyal** · [GitHub](https://github.com/punitbadyal01-blip). The developer section is available in Settings.
