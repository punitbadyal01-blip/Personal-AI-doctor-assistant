# Backend setup and phone testing

## 1. Open in VS Code

Open the root `HealthClear.code-workspace`. The workspace includes build, test, backend and USB-install tasks. Paths in `.vscode/tasks.json` match this computer (`D:/android` SDK and JDK 24); adjust them on another computer. Backend requires Node.js 20.12+; Node 24 is used here. There are no npm dependencies to install.

## 2. Configure the backend privately

Copy `.env.example` to `.env` in this folder if `.env` does not exist. This computer already has an ignored `.env` with a generated random backend access token. Keep that token private.

Set:

- `OPENAI_API_KEY`: your API project key. Keep it only on the server, never in the APK, GitHub, screenshots or chat.
- `OPENAI_MODEL`: an API model available to your account that supports image/PDF inputs and strict JSON-schema Responses output. Check the current provider model documentation; do not use a ChatGPT subscription name.
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

Accept the processing notice before choosing a personal report. The device sends traffic through the USB forward to your local backend, and the backend calls OpenAI over HTTPS. This is not offline medical analysis. Only the development build permits HTTP to this exact loopback origin. Never use this development APK for broad distribution.

## 4. Deploy for use without USB

Build the Dockerfile from this directory, or deploy `server.mjs` as a Node service with the environment variables above. Bind `HOST=0.0.0.0` inside the hosting environment. Put the service behind a valid HTTPS endpoint. Set ingress limits to at least 14 MB and request timeouts above 100 seconds. Disable body/header logging, debug traces and request payload capture in the hosting platform. Do not put the provider key or access token in URLs.

    docker build -t healthclear-backend .
    docker run --env-file .env -e HOST=0.0.0.0 -p 127.0.0.1:8080:8080 healthclear-backend

Configure your HTTPS reverse proxy/hosting service separately. HTTPS certificates must be trusted by Android; the app does not disable certificate checks or follow redirects with credentials. Use the regular `HealthClear-1.2.apk` with the HTTPS origin and backend token.

This backend is intended for a personal prototype or a small controlled test. It has token authentication, a bounded request body, a 2-request concurrency cap and 60-request/10-minute cap per process. Multi-user deployment needs individual identities, per-user quotas, monitoring that avoids medical content, clinical review, and appropriate data-processing agreements. There is no server report database or account system.

## API

All POST routes require `Authorization: Bearer <backend token>`. Except `/v1/status`, requests require `consent:true`.

- `POST /v1/status`: provider configuration status and retention notice.
- `POST /v1/ocr`: `{mime, base64, consent}`; returns classified document type and extracted lines with page/uncertainty. PDFs use inline file data; images use image inputs.
- `POST /v1/explain`: `{text, language, consent}`; returns findings, follow-up claims with exact source quotes and zero-based line references, general definitions and doctor questions.
- `POST /v1/chat`: `{text, language, question, consent}`; returns cited claims and whether evidence is sufficient.

Only `en`, `hi`, `te` are accepted. Missing/uncertain text, invalid references and unsupported generated numbers are rejected. Prompt-level guardrails are not a guarantee of clinical correctness: human review of source text and clinician interpretation remain necessary.

## Privacy

Requests use the provider Responses API with `store:false`; that does not guarantee zero provider retention. This server does not persist medical content or log bodies. Provider abuse-monitoring retention and exceptions still apply; review your provider settings and agreements. Uploaded content is treated as data, not instructions. No training consent collection is implemented. Android saves report text/explanation only on explicit Save, encrypted with Android Keystore; backup is disabled. Original files are temporary and are not in saved history. The app can delete local history. Export writes a plaintext summary to a location explicitly chosen by the user.

Official implementation references: [File inputs](https://developers.openai.com/api/docs/guides/file-inputs), [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Data controls and retention](https://developers.openai.com/api/docs/guides/your-data).

## Tests and troubleshooting

From `healthclear`: `npm test`. Automated provider tests use mocked responses; they incur no API charges and do not establish live clinical accuracy.

`fixture-server.mjs` is ONLY for automated emulator tests and produces fictional outputs. Do not deploy it, run it as the normal backend, or send personal reports to it. The production Dockerfile includes only `server.mjs`.

- **App not installed:** run the USB install task to capture Android’s exact error. Do not uninstall an existing app unless you accept losing its local data.
- **Connection failed:** backend process, URL, USB authorization, port forwarding and token must match. Normal APK requires HTTPS; USB HTTP needs the development APK.
- **Provider request failed:** check provider key, model permissions and billing on the server. No fabricated explanation is shown.
- **No offline voice:** install the corresponding English/Hindi/Telugu voice through Android text-to-speech settings. Text remains readable.
- **Uncertain OCR:** retry with a clearer written report, or accurately correct the text; never guess a number.
