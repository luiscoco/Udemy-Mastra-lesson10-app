# Mastra · Lesson 10 · Streaming Error Handling and Retries

Exercise real browser streaming and injected failures, then connect the same bounded retry policy to a genuine Mastra agent stream.

![Lesson 10 application](docs/application-preview.png)

## What this application does

This explicitly labelled local transport exercise delivers deterministic fixture chunks through the actual HTTP stream. It tests delivery and retry behavior, not a simulated AI answer.

**Practical mode:** Real streamed fault-injection exercise · no model call.

The local lab uses controlled fixture text and injected errors to exercise real HTTP delivery. Live mode invokes Mastra Agent.stream. The application does not claim invented provider performance or hidden reasoning.

## Run the application

Use **Node.js 24+**. Each lesson is an independent repository with its own dependency lockfile.

```powershell
git clone https://github.com/luiscoco/Udemy-Mastra-lesson10-app.git
cd Udemy-Mastra-lesson10-app
npm ci
npm start
```

Open **http://127.0.0.1:3210** and choose **Run practical lab**. The practical operation requires no model key. Starting the server does not make a provider request. Keep the terminal open; Ctrl+C stops it. To change the port, set PORT in the environment or local .env file.

## Application pages

| Page | Content |
| --- | --- |
| Application lab | Editable JSON cases, actual execution, formatted result, event log and structured metadata |
| What you will learn | Lesson objectives, comprehension checks and a concrete exercise |
| How to run | Installation, local/live modes, commands and troubleshooting |
| Architecture & workflow | The practical execution sequence and the actual request runner |
| Code walkthrough | Source-derived excerpts with GitHub line references |

The application supports light/dark themes, mobile layouts, sanitized Markdown, syntax-highlighted code and copy-code controls.

## Practical execution workflow

| Stage | Source | Actual behavior |
| --- | --- | --- |
| Validate fixture policy | [src/lab.ts](src/lab.ts) | Choose a labelled fixture scenario, 10–500 ms chunk delay and at most two attempts. |
| Emit timed text | [src/lab.ts](src/lab.ts) | Send real timed NDJSON delta events with explicitly deterministic fixture text. |
| Apply retry boundary | [src/mastra/retries.ts](src/mastra/retries.ts) | Retry eligible transient errors only before visible text and within the attempt limit. |
| Check completion | [src/client.ts](src/client.ts) | Preserve partial text; distinguish completion, partial failure, permanent failure and user cancellation. |

The browser posts JSON to **POST /api/lab**. The host validates the envelope, runs the lesson implementation and sends NDJSON events. The UI renders the actual result and a separate application outcome. **GET /api/config** exposes public lesson metadata and credential-presence readiness, never credential values.

## Classroom cases and expected outcomes

### 1. Retry a transient pre-output failure

```json
{
  "scenario": "transient-before-text",
  "chunkDelayMs": 40,
  "maxAttempts": 2
}
```

**Expected:** Two application attempts, one bounded retry and a complete fixture stream.

### 2. Fail after partial output

```json
{
  "scenario": "partial-failure",
  "chunkDelayMs": 100,
  "maxAttempts": 2
}
```

**Expected:** Partial text remains visible and is not automatically replayed.

### 3. Test Stop while streaming

```json
{
  "scenario": "success",
  "chunkDelayMs": 200,
  "maxAttempts": 2
}
```

**Expected:** Use Stop during delivery; cancellation must not trigger a retry.

## Interpreting the result

- The default transient-before-text fixture completes on attempt 2.
- partial-failure retains text and stops after attempt 1, even if maxAttempts=2.
- Stop aborts the HTTP request and shows Cancelled; partial text is not a completed answer.
- Network chunks are arbitrary boundaries, not guaranteed words or tokens.

**Complete** means the operation met its implemented completion checks. **Needs attention** exposes a business, format or validation finding. **Could not finish** is an execution/request failure. **Cancelled** is a separate user action. Read the evidence before treating any runtime status as task correctness.

## Optional live-agent workflow

1. Ignore the fixture scenario and call the real Agent.stream() API with SDK retries explicitly set to zero.
2. Render textStream chunks as they arrive, then inspect getFullOutput() and the finish reason.
3. Apply the same bounded retry policy; never automatically replay after visible text or cancellation.

The live button uses **POST /api/query** and a real provider, and may incur API usage. Tests use an explicit SDK model adapter; no paid provider call is claimed by the test evidence.

Configure your own credentials locally, preserving any existing .env:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

```dotenv
# Set your own provider credential locally. No credential is copied from another app.
OPENAI_API_KEY=your_api_key
MASTRA_MODEL=openai/gpt-4.1-mini
PORT=3210
```

Choose a model your account can access and restart the server. Credentials remain on the host and are ignored by Git. Existing shell values take precedence over the optional .env file. Provider/model availability and supported parameters must be checked for your selected model.

## Build, samples and verification

```powershell
npm run sample
npm run build
npm test
npm run test:browser
```

- **sample:** executes the default practical case without a provider key.
- **sample:live:** runs an actual provider request after configuration; invoke separately with npm run sample:live.
- **build:** regenerates all five pages, actual-source excerpts, architecture SVG, this README and the browser bundle.
- **test:** typechecks and runs offline local-operation, invalid-input, cancellation, real-SDK adapter, generated-content and HTTP-boundary checks, plus lesson-specific regression cases.
- **test:browser:** uses isolated headless Chrome to execute the real practical lab and its failure case, verify all five pages and mobile layout, check theme persistence, syntax colors and safe Markdown, and save [browser evidence](docs/browser-qa.json). The live-renderer fixture makes no provider request. It also checks partial streaming failure and Stop.

Set BROWSER_EXECUTABLE if Chrome/Chromium is not installed at the platform’s standard path. Browser tests are local; GitHub Actions runs npm ci, build and the offline test suite.

## Dependencies

| Runtime package | Pinned version |
| --- | --- |
| @mastra/core | 1.81.0 |
| dompurify | 3.4.17 |
| marked | 18.1.3 |
| zod | 4.6.7 |

The committed package-lock.json fixes the installed dependency tree. A remote model alias is independent of the JavaScript lockfile.

## Student exercise

Compare transient-before-text with partial-failure, then cancel during delivery. Use the observed attempt count and final state to explain when retrying is appropriate.

Rebuild after a source change so the explanation pages, line references and README remain consistent with the running code.

## Source and references

- [src/lab.ts](src/lab.ts)
- [src/mastra/retries.ts](src/mastra/retries.ts)
- [src/mastra/agents.ts](src/mastra/agents.ts)
- [src/mastra/index.ts](src/mastra/index.ts)
- [HTTP host](src/server.ts)
- [Execution envelope](src/runner.ts)
- [Page and README generator](scripts/build-pages.ts)
- [Mastra streaming guide](https://mastra.ai/docs/guides/streaming)
- [Agent generation and limits](https://mastra.ai/reference/agents/generate)

Prism’s license is included in [public/prism-LICENSE.txt](public/prism-LICENSE.txt).
