import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { DEADLINE_MS, requestSchema } from "./core.js";
import { LESSON } from "./lesson.js";
import { dispose } from "./lab.js";
import { liveConfiguration, runLesson } from "./runner.js";

const root = new URL("../public/", import.meta.url);
const files: Record<string, string> = {
  "index.html": "text/html", "learn.html": "text/html", "run.html": "text/html", "walkthrough.html": "text/html", "architecture.html": "text/html",
  "style.css": "text/css", "lesson.css": "text/css", "lab.css": "text/css", "code-highlighting.css": "text/css",
  "client.js": "text/javascript", "navigation.js": "text/javascript", "prism.js": "text/javascript", "code-highlighting.js": "text/javascript",
  "astronaut.png": "image/png", "architecture.svg": "image/svg+xml",
};
function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(body));
}
class InputError extends Error { constructor(readonly status: number, message: string) { super(message); } }
async function readJson(req: IncomingMessage): Promise<unknown> {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") throw new InputError(415, "Send JSON.");
  return new Promise((resolveBody, reject) => {
    let size = 0; let failed = false; const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > 24000) { failed = true; chunks.length = 0; reject(new InputError(413, "The request is too large.")); }
      else chunks.push(chunk);
    });
    req.on("end", () => {
      if (failed) return;
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new InputError(400, "Enter valid JSON.")); }
    });
    req.on("error", () => reject(new InputError(400, "The request could not be read.")));
    req.on("aborted", () => reject(new InputError(400, "The request was cancelled.")));
  });
}
export function createLessonServer() {
  let busy = false;
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (req.method === "GET" && Object.hasOwn(files, file)) {
        const data = await readFile(new URL(file, root));
        res.writeHead(200, { "Content-Type": files[file] + (files[file].startsWith("text/") ? "; charset=utf-8" : "") }); res.end(data); return;
      }
      if (req.method === "GET" && url.pathname === "/api/health") { json(res, 200, { application: `mastra-lesson${String(LESSON.number).padStart(2, "0")}` }); return; }
      if (req.method === "GET" && url.pathname === "/api/config") { json(res, 200, { ...liveConfiguration(), lesson: LESSON }); return; }
      if (req.method !== "POST" || !["/api/lab", "/api/query"].includes(url.pathname)) { json(res, 404, { error: "Not found." }); return; }
      const host = req.headers.host;
      if (!host || !/^(?:localhost|127\.0\.0\.1):\d+$/.test(host) || (req.headers.origin && req.headers.origin !== `http://${host}`)) throw new InputError(403, "Use this application's local page.");
      const { input, question } = requestSchema.parse(await readJson(req));
      const mode = url.pathname === "/api/lab" ? "lab" : "live";
      if (mode === "live" && !liveConfiguration(input).ready) throw new InputError(503, "Configure the selected provider credential in .env and restart. The practical lab works without a model key.");
      if (busy) throw new InputError(409, "A run is active. Wait or use Stop.");
      busy = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEADLINE_MS);
      res.on("close", () => { if (!res.writableEnded) controller.abort(); });
      res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" });
      const emit = (event: unknown) => { if (!res.destroyed) res.write(JSON.stringify(event) + "\n"); };
      try { await runLesson(mode, input, question, emit, controller.signal); }
      catch (error) {
        if (error instanceof ZodError) emit({ type: "error", text: "The input does not match this lab's schema.", data: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })) });
        else emit({ type: "error", text: controller.signal.aborted ? "The run was cancelled or timed out. Partial text is not a completed result." : "The operation could not finish. Check the input, configuration and the lesson's troubleshooting steps." });
      } finally { clearTimeout(timer); busy = false; if (!res.destroyed) res.end(); }
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      json(res, error instanceof InputError ? error.status : error instanceof ZodError ? 400 : 500,
        { error: error instanceof InputError ? error.message : error instanceof ZodError ? "The request does not match the application contract." : "The request could not complete." });
    }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 3200 + LESSON.number);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
  const server = createLessonServer();
  server.on("error", (error: NodeJS.ErrnoException) => { console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use; choose another PORT.` : "The local server could not start."); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`Mastra Lesson ${LESSON.number} · http://127.0.0.1:${port} · ${LESSON.localMode}`));
  const shutdown = () => { server.closeAllConnections(); server.close(() => { void dispose().finally(() => process.exit(0)); }); };
  process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
}
