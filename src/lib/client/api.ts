/** Small helper for calling the app's own API with the signed-in user's token. */
export type ApiResult<T> = { ok: boolean; status: number; data: T & { error?: string } };

export async function apiCall<T = Record<string, unknown>>(
  getIdToken: () => Promise<string | null>,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<ApiResult<T>> {
  const token = await getIdToken();
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    let data: unknown = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return { ok: res.ok, status: res.status, data: data as ApiResult<T>["data"] };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "You seem to be offline. Please check your connection and try again." } as ApiResult<T>["data"],
    };
  }
}

export function formatMoney(amount: string | number, currency = "INR"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
