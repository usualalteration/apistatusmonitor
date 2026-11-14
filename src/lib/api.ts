/**
 * Shared fetch wrapper for the OpenServerless web-action API.
 *
 * The OpenServerless controller answers a web-action request with
 * HTTP 202 and {"error": "Response not yet ready."} when the activation
 * has not finished within its blocking window — typically the first
 * request after the action container has gone cold (for example the
 * first check on a freshly deployed or long-idle app). The activation
 * keeps running in the background, so a short retry lands on the
 * now-warm container and returns the real result.
 *
 * apiFetchJSON retries that envelope (and empty/malformed success
 * bodies) with bounded backoff, then returns the parsed JSON payload
 * for the caller's normal handling.
 */

const PENDING_MARKER = "Response not yet ready";

export class ApiPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiPendingError";
  }
}

export interface ApiFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /** Extra attempts after a retryable response. Default 4. */
  retries?: number;
  /** Delay before the first retry; doubles each attempt. Default 2000ms. */
  retryDelayMs?: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export { sleep };

const hasPendingError = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const obj = payload as Record<string, unknown>;
  return (
    typeof obj.error === "string" && obj.error.includes(PENDING_MARKER)
  );
};

/** True when the response is the controller's "activation still running" envelope. */
const isPendingResponse = (status: number, payload: unknown): boolean =>
  status === 202 || hasPendingError(payload);

const parseBody = async (response: Response): Promise<unknown> => {
  const text = (await response.text()).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Fetch a JSON web-action endpoint, retrying while the backend reports
 * that the activation is still pending.
 */
export async function apiFetchJSON(
  url: string,
  options: ApiFetchOptions = {},
): Promise<unknown> {
  const {
    method = "GET",
    headers,
    body,
    retries = 4,
    retryDelayMs = 2000,
  } = options;

  let delay = retryDelayMs;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { method, headers, body });
    const payload = await parseBody(response);

    if (isPendingResponse(response.status, payload)) {
      if (attempt >= retries) {
        throw new ApiPendingError(
          "The backend is still starting up. Please try again in a moment.",
        );
      }
      await sleep(delay);
      delay *= 2;
      continue;
    }

    // A 200 with an empty or non-JSON body is a broken proxy response,
    // not an application payload — retry it as well.
    if (response.ok && payload === null) {
      if (attempt >= retries) {
        throw new Error(`Request failed: ${response.status}`);
      }
      await sleep(delay);
      delay *= 2;
      continue;
    }

    return payload;
  }
}

export const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};
