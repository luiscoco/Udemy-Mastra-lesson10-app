export function transient(error: unknown) {
  const value = error as { statusCode?: number; status?: number; code?: string };
  return [408, 429, 500, 502, 503, 504].includes(value?.statusCode || value?.status || 0) || ["ECONNRESET", "ETIMEDOUT"].includes(value?.code || "");
}
export function mayRetry(error: unknown, attempt: number, maximum: number, visibleCharacters: number, signal: AbortSignal) {
  return !signal.aborted && visibleCharacters === 0 && attempt < maximum && transient(error);
}
export async function delay(ms: number, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const done = () => { signal.removeEventListener("abort", abort); resolve(); };
    const timer = setTimeout(done, ms);
    const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(new DOMException("Cancelled", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
  });
}
