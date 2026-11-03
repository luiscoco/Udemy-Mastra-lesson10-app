import type { LessonMetadata } from "./core.js";

export const LESSON = {
  "number": 10,
  "title": "Streaming Error Handling and Retries",
  "shortTitle": "Streaming and retries",
  "eyebrow": "STREAM · CANCEL · RECOVER",
  "hero": "Handle a stream",
  "accent": "all the way through.",
  "description": "Exercise real browser streaming and injected failures, then connect the same bounded retry policy to a genuine Mastra agent stream.",
  "labTitle": "Run the stream fault-injection lab",
  "labDescription": "This explicitly labelled local transport exercise delivers deterministic fixture chunks through the actual HTTP stream. It tests delivery and retry behavior, not a simulated AI answer.",
  "localMode": "Real streamed fault-injection exercise · no model call",
  "defaultQuestion": "Explain why a stream that failed after emitting text should not be blindly retried.",
  "objectives": [
    {
      "title": "Append delivery chunks correctly",
      "text": "Chunks are delivery units, not guaranteed words or Markdown blocks. The browser accumulates text and renders the current safe Markdown view."
    },
    {
      "title": "Distinguish run states",
      "text": "Idle, running, completed, failed and cancelled are separate states. Receiving some text does not justify reporting success."
    },
    {
      "title": "Retry only appropriate failures",
      "text": "The application retries selected transient statuses before visible output, within a two-attempt budget. Permanent input errors are not retried."
    },
    {
      "title": "Preserve partial output",
      "text": "Once text has been emitted, an automatic restart can duplicate or contradict it. The lab exposes the partial text and the failure outcome."
    },
    {
      "title": "Propagate cancellation",
      "text": "Stop aborts the browser request and the server's work. Abort during delivery or backoff is not treated as a transient provider failure."
    },
    {
      "title": "Inspect actual evidence",
      "text": "Attempt counts and retry events come from executed code. Local fault injection is clearly labelled; live mode uses Agent.stream and its final output."
    }
  ],
  "workflow": [
    "Validate scenario and retry budget",
    "Start one stream attempt",
    "Append observed text chunks",
    "Classify an error before retrying",
    "Stop on partial failure or cancellation",
    "Check final completion explicitly"
  ],
  "scope": "The local lab uses controlled fixture text and injected errors to exercise real HTTP delivery. Live mode invokes Mastra Agent.stream. The application does not claim invented provider performance or hidden reasoning.",
  "examples": [
    {
      "name": "Retry a transient pre-output failure",
      "input": {
        "scenario": "transient-before-text",
        "chunkDelayMs": 40,
        "maxAttempts": 2
      },
      "expected": "Two application attempts, one bounded retry and a complete fixture stream."
    },
    {
      "name": "Fail after partial output",
      "input": {
        "scenario": "partial-failure",
        "chunkDelayMs": 100,
        "maxAttempts": 2
      },
      "expected": "Partial text remains visible and is not automatically replayed."
    },
    {
      "name": "Test Stop while streaming",
      "input": {
        "scenario": "success",
        "chunkDelayMs": 200,
        "maxAttempts": 2
      },
      "expected": "Use Stop during delivery; cancellation must not trigger a retry."
    }
  ],
  "sourceFiles": [
    "src/lab.ts",
    "src/mastra/retries.ts",
    "src/mastra/agents.ts",
    "src/mastra/index.ts"
  ],
  "exercise": "Compare transient-before-text with partial-failure, then cancel during delivery. Use the observed attempt count and final state to explain when retrying is appropriate.",
  "checks": [
    {
      "question": "Is one received chunk proof of success?",
      "answer": "No. Completion depends on a final successful outcome. A transport or provider failure can occur after partial text."
    },
    {
      "question": "Should cancellation retry automatically?",
      "answer": "No. It is an intentional stop signal, including during retry backoff."
    },
    {
      "question": "Are the local fixture chunks actual model output?",
      "answer": "No. They are explicitly labelled deterministic transport fixtures. The separately configured live action uses a real Mastra stream."
    }
  ],
  "docs": [
    {
      "title": "Mastra streaming guide",
      "url": "https://mastra.ai/docs/guides/streaming"
    },
    {
      "title": "Agent generation and limits",
      "url": "https://mastra.ai/reference/agents/generate"
    }
  ],
  "readmeWorkflow": [
    {
      "step": "Validate fixture policy",
      "component": "src/lab.ts",
      "behavior": "Choose a labelled fixture scenario, 10–500 ms chunk delay and at most two attempts."
    },
    {
      "step": "Emit timed text",
      "component": "src/lab.ts",
      "behavior": "Send real timed NDJSON delta events with explicitly deterministic fixture text."
    },
    {
      "step": "Apply retry boundary",
      "component": "src/mastra/retries.ts",
      "behavior": "Retry eligible transient errors only before visible text and within the attempt limit."
    },
    {
      "step": "Check completion",
      "component": "src/client.ts",
      "behavior": "Preserve partial text; distinguish completion, partial failure, permanent failure and user cancellation."
    }
  ],
  "liveWorkflow": [
    "Ignore the fixture scenario and call the real Agent.stream() API with SDK retries explicitly set to zero.",
    "Render textStream chunks as they arrive, then inspect getFullOutput() and the finish reason.",
    "Apply the same bounded retry policy; never automatically replay after visible text or cancellation."
  ],
  "outcomeNotes": [
    "The default transient-before-text fixture completes on attempt 2.",
    "partial-failure retains text and stops after attempt 1, even if maxAttempts=2.",
    "Stop aborts the HTTP request and shows Cancelled; partial text is not a completed answer.",
    "Network chunks are arbitrary boundaries, not guaranteed words or tokens."
  ]
} satisfies LessonMetadata;
