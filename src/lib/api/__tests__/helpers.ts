import { vi } from "vitest";

export const TEST_API_BASE_URL = "https://api.test/v1";

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export function successEnvelope(
  data: unknown,
  init: ResponseInit = {},
): Response {
  return jsonResponse({ success: true, data }, init);
}

export function failureResponse(
  status: number,
  options: {
    code?: string;
    message?: string;
    details?: unknown;
    headers?: HeadersInit;
  } = {},
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        code: options.code ?? "REQUEST_FAILED",
        message: options.message ?? "Request failed",
        details: options.details,
      },
    },
    {
      status,
      headers: options.headers,
    },
  );
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function invalidJsonResponse(status = 200): Response {
  return new Response("{not-json", {
    status,
    headers: { "content-type": "application/json" },
  });
}

export interface FetchCall {
  url: string;
  init: RequestInit & { next?: unknown };
}

export function createFetchMock(
  handler: (
    call: FetchCall,
    index: number,
  ) => Response | Promise<Response>,
) {
  const calls: FetchCall[] = [];

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const call: FetchCall = {
        url: String(input),
        init: init ?? {},
      };
      calls.push(call);

      return handler(call, calls.length - 1);
    },
  );

  return { fetchMock, calls };
}

export function header(
  call: FetchCall,
  name: string,
): string | null {
  return new Headers(call.init.headers).get(name);
}

export function stubBrowserWindow() {
  const dispatchEvent = vi.fn();
  vi.stubGlobal("window", { dispatchEvent });

  return { dispatchEvent };
}

export function abortableFetch(): {
  fetchMock: ReturnType<typeof vi.fn>;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];

  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const call: FetchCall = {
        url: String(input),
        init: init ?? {},
      };
      calls.push(call);

      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;

        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    },
  );

  return { fetchMock, calls };
}
