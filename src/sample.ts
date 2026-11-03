import { LESSON } from "./lesson.js";
import { DEADLINE_MS } from "./core.js";
import { liveConfiguration, runLesson } from "./runner.js";
import { dispose } from "./lab.js";

const mode = process.argv.includes("--live") ? "live" : "lab";
const sample = LESSON.examples[0].input;
if (mode === "live" && !liveConfiguration(sample).ready) {
  console.error("Configure the selected provider credential in your own .env file, then restart. npm run sample performs the key-free practical operation.");
  process.exitCode = 1;
} else {
  try {
    await runLesson(mode, sample, LESSON.defaultQuestion, event => console.log(JSON.stringify(event)), AbortSignal.timeout(DEADLINE_MS));
  } catch {
    console.error("The example did not finish. Check the input, selected provider configuration and model access.");
    process.exitCode = 1;
  } finally { await dispose(); }
}
