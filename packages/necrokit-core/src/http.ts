import type { Unavailable } from "./contracts.js";

export type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

export interface HttpOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/** Either the parsed body, or the reason it could not be read. Never throws. */
export type FetchResult = { ok: true; status: number; body: unknown } | { ok: false; status: number | null; reason: string };

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * GET a JSON document with a timeout. Network errors, timeouts, rate limits,
 * and non-JSON bodies all come back as `{ ok: false, reason }` so adapters can
 * turn them into unavailable evidence instead of crashing a report.
 */
export async function fetchJson(url: string, options: HttpOptions = {}): Promise<FetchResult> {
  const doFetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);
  if (!doFetch) return { ok: false, status: null, reason: "No fetch implementation is available." };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await doFetch(url, { headers: { Accept: "application/json", ...options.headers }, signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status, reason: describeStatus(res.status, res.headers) };
    return { ok: true, status: res.status, body: await res.json() };
  } catch (error) {
    const aborted = controller.signal.aborted;
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: null, reason: aborted ? "Request timed out." : `Network error: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

function describeStatus(status: number, headers: { get(name: string): string | null }): string {
  const remaining = headers.get("x-ratelimit-remaining");
  if (status === 429 || (status === 403 && remaining === "0")) {
    const reset = Number(headers.get("x-ratelimit-reset"));
    const when = Number.isFinite(reset) && reset > 0 ? ` until ${new Date(reset * 1000).toISOString().slice(11, 16)} UTC` : "";
    return `Rate limit reached${when}. Use a recorded fixture or try later.`;
  }
  if (status === 404) return "Not found (HTTP 404).";
  return `Request failed with HTTP ${status}.`;
}

/** Shorthand for turning a failed fetch into an unavailable entry. */
export function unavailableFrom(id: string, source: string, result: Extract<FetchResult, { ok: false }>): Unavailable {
  return { id, source, reason: result.reason };
}
