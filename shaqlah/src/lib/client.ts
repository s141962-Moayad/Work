"use client";

export class ClientApiError extends Error {
  constructor(message: string, public status: number, public field?: string, public extra?: any) {
    super(message);
  }
}

/** fetch wrapper for our JSON API. Returns `data` or throws ClientApiError with an Arabic message. */
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ClientApiError("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.", 0);
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok || !json?.ok) {
    throw new ClientApiError(json?.error ?? "حدث خطأ غير متوقع، يرجى المحاولة لاحقًا.", res.status, json?.field, json);
  }
  return json.data as T;
}

export function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
