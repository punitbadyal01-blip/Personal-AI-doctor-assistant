For optional cloud accounts and private report history, follow [Supabase setup](../supabase/README.md).

# Backend setup and phone testing

## 1. Open in VS Code

Open the root `HealthClear.code-workspace`. The workspace includes build, test, backend and USB-install tasks. Paths in `.vscode/tasks.json` match this computer (`D:/android` SDK and JDK 24); adjust them on another computer. Backend requires Node.js 20.12+; Node 24 is used here. There are no npm dependencies to install.

## 2. Configure the backend privately

Copy `.env.example` to `.env` in this folder if `.env` does not exist. This computer already has an ignored `.env` with a generated random backend access token. Keep that token private.

Choose a provider with `AI_PROVIDER=openai` or `AI_PROVIDER=gemini`. There is no automatic fallback to another provider. Keep the provider key only in this server-side `.env`, never in the APK, GitHub, screenshots or chat.

For a **Google AI Studio / Gemini API key**, set:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=your_exact_gemini_model_id
GEMINI_PAID_SERVICE=false
```

Replace the model placeholder with the exact Gemini model ID available to your project (the `gemini-...` identifier, not “Google AI Studio”). Choose a model supporting image/PDF input and structured JSON output. The backend uses Google's `generateContent` REST API, inline files and a JSON schema, and validates the returned source links and measurements with the same checks as the OpenAI adapter.

Personal uploads remain disabled while `GEMINI_PAID_SERVICE=false`. Set it to `true` **only after confirming an active Cloud Billing account for the key's project** and reviewing Google's data terms. This flag records your declaration; the app cannot verify billing. Google's unpaid services may use inputs and responses to improve products and explicitly prohibit submitting sensitive personal information. Paid services have different data-use terms, but retention still applies. Offline fictional samples require no key or billing. Do not enable billing or incur charges without the project owner's authorization.

To test your Gemini key with unpaid quota, leave `GEMINI_PAID_SERVICE=false`, fill in the key and exact model ID, then run `npm run test:gemini` from `healthclear`. This separate command sends only a fixed fictional report embedded in its source. It does not accept files or personal text and does not enable the app's personal-upload routes. Quota/model availability may still prevent the test from completing. This is an optional live provider call, not part of `npm test`.

For **OpenAI**, set `AI_PROVIDER=openai` and:

- `OPENAI_API_KEY`: your API project key. Keep it only on the server, never in the APK, GitHub, screenshots or chat.
- `OPENAI_MODEL`: an API model available to your account that supports image/PDF inputs and strict JSON-schema Responses output. Check the current provider model documentation; do not use a ChatGPT subscription name.
For either provider, also set:

- `HEALTHCLEAR_ACCESS_TOKEN`: a random secret of at least 32 characters. This protects this personal backend instance. The app uses this token, not the provider key.
- `HOST=127.0.0.1`, `PORT=8080` for local USB development.

Generate a replacement token locally if needed:

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

Do not commit `.env`. In VS Code, run **HealthClear: Start backend**, or use:

    cd healthclear/backend
    node --env-file-if-exists=.env server.mjs

`GET http://127.0.0.1:8080/health` returns `{"status":"ok"}` when the process is running. This does not prove provider access. The app’s authenticated Connect & test checks that provider settings exist; the first real extraction verifies provider access, model compatibility and billing.

## 3. Connect your Redmi / other Android phone

Enable USB debugging in Android Developer options, attach a data-capable USB cable and accept the computer authorization prompt on the phone. Keep the device unlocked for the install confirmation. VS Code’s **HealthClear: Install and run on USB phone** task builds a development APK, installs it without uninstalling existing data, sets `adb reverse tcp:8080 tcp:8080`, and launches HealthClear.

If multiple devices/emulators are connected, choose a serial explicitly:

    powershell -File healthclear/android/install-phone.ps1 -Development -Serial YOUR_DEVICE_SERIAL

Find serials with `D:/android/platform-tools/adb.exe devices`. A state of `unauthorized` requires the authorization prompt on the phone; `offline` is not ready. Installation restrictions or blocked installs must be resolved on the device; the task does not bypass them.

In the development app go to Settings:

- Backend address: `http://127.0.0.1:8080`
- Access token: `HEALTHCLEAR_ACCESS_TOKEN` from your `.env`
- Tap **Connect & test**, then return to Upload.

Accept the processing notice before choosing a personal report. The device sends traffic through the USB forward to your local backend, and the backend calls the selected AI provider over HTTPS. This is not offline medical analysis. Only the development build permits HTTP to this exact loopback origin. Never use this development APK for broad distribution.

## 4. Deploy for use without USB

Build the Dockerfile using the healthclear directory as context, or deploy `backend/server.mjs`, `backend/cloud.mjs`, `dist/languages.js` and `package.json` with the same folder structure as a Node service with the environment variables above. Bind `HOST=0.0.0.0` inside the hosting environment. Put the service behind a valid HTTPS endpoint. Set ingress limits to at least 14 MB and request timeouts above 100 seconds. Disable body/header logging, debug traces and request payload capture in the hosting platform. Do not put the provider key or access token in URLs.

    docker build -f Dockerfile -t healthclear-backend ..
    docker run --env-file .env -e HOST=0.0.0.0 -p 127.0.0.1:8080:8080 healthclear-backend

Configure your HTTPS reverse proxy/hosting service separately. HTTPS certificates must be trusted by Android; the app does not disable certificate checks or follow redirects with credentials. Use the regular `HealthClear-1.5.1.apk` with the HTTPS origin and backend token.

This backend is intended for a personal prototype or a small controlled test. It has token authentication, a bounded request body, a 2-request concurrency cap and 60-request/10-minute cap per process. Multi-user deployment needs individual identities, per-user quotas, monitoring that avoids medical content, clinical review, and appropriate data-processing agreements. Supabase supplies optional user accounts and explicitly saved report text; the shared backend access token remains required for this controlled deployment.

## API

All POST routes require `Authorization: Bearer <backend token>`. Analysis routes require `consent:true`. Cloud saves instead require `saveConsent:true`; account operations use their corresponding confirmation and session fields.

- `POST /v1/status`: AI/Supabase configuration status and retention notice.
- `POST /v1/cloud`: email sign-up/sign-in, Google PKCE start/exchange, report list/save/open/delete, logout and confirmed account deletion. Report operations use the caller's Supabase user session. See the Supabase guides for setup.
- `POST /v1/ocr`: `{mime, base64, consent}`; returns classified document type and extracted lines with page/uncertainty. PDFs use inline file data; images use image inputs.
- `POST /v1/explain`: `{text, language, consent}`; returns findings, follow-up claims with exact source quotes and zero-based line references, general definitions and doctor questions.
- `POST /v1/chat`: `{text, language, question, consent}`; returns cited claims and whether evidence is sufficient.

Explanation languages accept the supported base languages and bounded regional tags in `dist/languages.js`; interface translations remain English, Hindi and Telugu. Missing/uncertain text, invalid references and unsupported generated numbers are rejected. Prompt-level guardrails are not a guarantee of clinical correctness: human review of source text and clinician interpretation remain necessary.

## Privacy

OpenAI requests use Responses with `store:false`. Gemini requests use `generateContent` with `store:false` and inline file data, without creating Files API uploads or explicit caches. Neither setting guarantees zero provider retention or changes unpaid-service data terms. Analysis is transient and request bodies are not logged. Explicit cloud saves persist reviewed report text in Supabase until deleted; provider backup retention applies. Provider abuse-monitoring retention and exceptions still apply; review your provider settings and agreements. Uploaded content is treated as data, not instructions. No training consent collection is implemented. Android saves report text/explanation only on explicit Save, encrypted with Android Keystore; backup is disabled. Original files are temporary and are not in saved history. The app can delete local history. Export writes a plaintext summary to a location explicitly chosen by the user.

Google references: [Generate content API](https://ai.google.dev/api/generate-content), [Structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Data-use terms](https://ai.google.dev/gemini-api/terms). Keep the app educational; these terms prohibit clinical practice and medical advice. Adding an adapter does not establish approval for a clinical deployment.

Official implementation references: [File inputs](https://developers.openai.com/api/docs/guides/file-inputs), [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Data controls and retention](https://developers.openai.com/api/docs/guides/your-data).

## Tests and troubleshooting

From `healthclear`: `npm test`. Automated provider tests use mocked responses; they incur no API charges and do not establish live clinical accuracy.

`fixture-server.mjs` is ONLY for automated emulator tests and produces fictional outputs. Do not deploy it, run it as the normal backend, or send personal reports to it. The production Dockerfile includes `server.mjs` and `cloud.mjs`, and excludes the fictional fixture service.

- **App not installed:** run the USB install task to capture Android’s exact error. Do not uninstall an existing app unless you accept losing its local data.
- **Connection failed:** backend process, URL, USB authorization, port forwarding and token must match. Normal APK requires HTTPS; USB HTTP needs the development APK.
- **Provider request failed:** check provider key, model permissions and billing on the server. No fabricated explanation is shown.
- **No offline voice:** install the corresponding English/Hindi/Telugu voice through Android text-to-speech settings. Text remains readable.
- **Uncertain OCR:** retry with a clearer written report, or accurately correct the text; never guess a number.


## Version 1.5 additions

For browser preview on this computer, use `http://127.0.0.1:5173` and set `HEALTHCLEAR_ALLOWED_ORIGINS=http://127.0.0.1:5173` in the backend environment. This local configuration was added privately without changing your keys. Restart the backend after editing `.env`. Browser local HTTP is limited to the explicit loopback preview; production Android still requires HTTPS. Other browser origins need explicit allow-list configuration. Remove development origins from a production deployment.

`POST /v1/cloud` also supports `recovery-start` (email, returns a PKCE verifier), `recovery-exchange` (code + verifier), and `password-update` (user session + password). Configure SMTP and the exact app Redirect URL before testing email recovery. Passwords must be 12–128 characters. This does not automatically configure Google OAuth.

Cloud list accepts a name `search` of at most 100 characters, `sort` of newest/oldest/name and a nonnegative `offset`. The 1.5 client requests pages of 50 rows with stable secondary ordering; older clients retain the original default of 100. Cloud saves accept an optional UUID `requestId`; replaying identical content returns the existing owned row, while reusing it for different content is rejected. This prevents duplicate submissions, not semantic deduplication of separate reports.

Run `npm run test:cloud` from healthclear for real backend/Supabase checks using temporary fictional users. The test removes them afterward. Do not run tests that create accounts against a production project. Browser tests use only fictional intercepted responses. The separate Android fixture, if explicitly used, runs on port 8091 and is excluded from production Docker images; emulator-only scripts forward device port 8080 to that port.
