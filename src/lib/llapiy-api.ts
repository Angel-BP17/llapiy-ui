import { config } from "@/config/llapiy-config";

type Primitive = string | number | boolean | null | undefined;
type QueryValue = Primitive | Primitive[];
type QueryParams = Record<string, QueryValue>;

export type ApiEnvelope<T> = {
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
};

export type ApiError = Error & {
  status?: number;
  payload?: unknown;
};

const authTokenKey = "llapiy_auth_token";

function toQueryString(query?: QueryParams) {
  if (!query) return "";
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === "") return;
        params.append(key, String(item));
      });
      return;
    }
    params.set(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(authTokenKey) ?? "";
}

function parseApiError(status: number, payload: unknown): ApiError {
  const message =
    (typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string" &&
      (payload as { message: string }).message) ||
    `Request failed with status ${status}`;

  const error = new Error(message) as ApiError;
  error.status = status;
  error.payload = payload;
  return error;
}

async function parseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function buildUrl(base: string, path: string, query?: QueryParams) {
  return `${base}${path}${toQueryString(query)}`;
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    body?: BodyInit | Record<string, unknown> | null;
    headers?: HeadersInit;
    query?: QueryParams;
    withAuth?: boolean;
  } = {}
) {
  const {
    method = "GET",
    body,
    headers,
    query,
    withAuth = true
  } = options;

  const token = withAuth ? getAuthToken() : "";
  const finalHeaders = new Headers(headers);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (withAuth && token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  if (!isFormData && body && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }

  const response = await fetch(buildUrl(baseUrl, path, query), {
    method,
    headers: finalHeaders,
    body:
      body && !isFormData && typeof body === "object"
        ? JSON.stringify(body)
        : (body as BodyInit | null | undefined)
  });

  const payload = await parseBody(response);
  if (!response.ok) throw parseApiError(response.status, payload);
  return payload as ApiEnvelope<T> | T;
}

export async function apiGet<T>(path: string, query?: QueryParams) {
  return request<T>(config.apiUrl, path, { method: "GET", query });
}

export async function apiPost<T>(
  path: string,
  body?: BodyInit | Record<string, unknown> | null
) {
  return request<T>(config.apiUrl, path, { method: "POST", body });
}

export async function apiPut<T>(
  path: string,
  body?: BodyInit | Record<string, unknown> | null
) {
  return request<T>(config.apiUrl, path, { method: "PUT", body });
}

export async function apiDelete<T>(path: string) {
  return request<T>(config.apiUrl, path, { method: "DELETE" });
}

export function unwrapData<T>(payload: ApiEnvelope<T> | T): T {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

export function toList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export async function downloadWebReport(
  path: string,
  query?: QueryParams,
  fallbackName = "reporte.pdf"
) {
  const token = getAuthToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(buildUrl(config.webUrl, path, query), {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const payload = await parseBody(response);
    throw parseApiError(response.status, payload);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filenameFromHeader =
    contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i)?.[1]?.replace(/"/g, "") ??
    "";
  const filename = decodeURIComponent(filenameFromHeader || fallbackName);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
