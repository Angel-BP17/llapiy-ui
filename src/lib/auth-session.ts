import { config } from "@/config/llapiy-config";
import { apiGet, toList, unwrapData } from "@/lib/llapiy-api";

type UnknownRecord = Record<string, unknown>;

export type AuthSession = {
  user: UnknownRecord | null;
  roles: string[];
  permissions: string[];
  permissionSet: Set<string>;
};

type CachedSession = {
  ts: number;
  user: UnknownRecord | null;
  roles: string[];
  permissions: string[];
};

const authPayloadKey = "llapiy_auth_payload";
const authTokenKey = "llapiy_auth_token";
const cacheKey = "llapiy_auth_session_cache";
const cacheTTL = 1000 * 60 * 10;

let inMemory: AuthSession | null = null;
let pending: Promise<AuthSession> | null = null;

function normalizePermission(value: string) {
  return value.trim().toLowerCase().replaceAll("_", "-");
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function normalizePermissionList(items: string[]) {
  return unique(items.map(normalizePermission));
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const rawValue = localStorage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(authTokenKey) ?? "";
}

function toStringArray(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (typeof value === "object" && value !== null) {
        if (typeof (value as { name?: unknown }).name === "string") {
          return (value as { name: string }).name;
        }
        if (typeof (value as { key?: unknown }).key === "string") {
          return (value as { key: string }).key;
        }
      }
      return "";
    })
    .filter(Boolean);
}

function extractRoles(source: unknown) {
  if (typeof source !== "object" || source === null) return [];

  const record = source as UnknownRecord;
  const fromRoles = toStringArray(record.roles);
  const fromRoleNames = toStringArray(record.role_names);
  const fromSingleRole = typeof record.role === "string" ? [record.role] : [];

  return unique([...fromRoles, ...fromRoleNames, ...fromSingleRole]);
}

function extractPermissions(source: unknown) {
  if (typeof source !== "object" || source === null) return [];

  const record = source as UnknownRecord;
  const direct = [
    ...toStringArray(record.permissions),
    ...toStringArray(record.permission_names),
    ...toStringArray(record.all_permissions),
    ...toStringArray(record.abilities),
  ];

  const fromCanMap =
    typeof record.can === "object" && record.can !== null
      ? Object.entries(record.can)
          .filter(([, value]) => Boolean(value))
          .map(([permission]) => permission)
      : [];

  const fromRoles = Array.isArray(record.roles)
    ? record.roles.flatMap((role) => {
        if (typeof role !== "object" || role === null) return [];
        return toStringArray((role as UnknownRecord).permissions);
      })
    : [];

  return normalizePermissionList([...direct, ...fromCanMap, ...fromRoles]);
}

function fromCachedSession(cached: CachedSession): AuthSession {
  const permissions = normalizePermissionList(cached.permissions ?? []);

  return {
    user: cached.user ?? null,
    roles: unique(cached.roles ?? []),
    permissions,
    permissionSet: new Set(permissions),
  };
}

function saveCachedSession(session: AuthSession) {
  if (typeof window === "undefined") return;

  const cache: CachedSession = {
    ts: Date.now(),
    user: session.user,
    roles: session.roles,
    permissions: session.permissions,
  };

  localStorage.setItem(cacheKey, JSON.stringify(cache));
}

function readCachedSession() {
  const cached = readJson<CachedSession>(cacheKey);
  if (!cached || !cached.ts || Date.now() - cached.ts > cacheTTL) return null;
  return fromCachedSession(cached);
}

async function resolvePermissionsFromRoles(roles: string[]) {
  if (!roles.length) return [];

  try {
    const response = await apiGet<{ roles?: unknown }>(config.endpoints.roles.list, { page: 1 });
    const data = unwrapData(response) as { roles?: unknown };
    const roleRecords = toList<any>(data?.roles);
    const roleNameSet = new Set(roles.map((role) => role.toLowerCase()));
    const permissions = roleRecords
      .filter((role) => roleNameSet.has(String(role?.name ?? "").toLowerCase()))
      .flatMap((role) => toList<any>(role?.permissions).map((permission) => String(permission?.name ?? "")));

    return normalizePermissionList(permissions);
  } catch {
    return [];
  }
}

async function buildSession() {
  const payload = readJson<UnknownRecord>(authPayloadKey) ?? {};
  const payloadUser =
    typeof payload.user === "object" && payload.user !== null
      ? (payload.user as UnknownRecord)
      : null;

  let user: UnknownRecord | null = payloadUser;
  let roles = extractRoles(payload);
  let permissions = extractPermissions(payload);

  if (payloadUser) {
    roles = unique([...roles, ...extractRoles(payloadUser)]);
    permissions = normalizePermissionList([...permissions, ...extractPermissions(payloadUser)]);
  }

  if (getToken()) {
    try {
      const meResponse = await apiGet<UnknownRecord>(config.endpoints.auth.me);
      const me = unwrapData(meResponse) as UnknownRecord;
      if (me && typeof me === "object") {
        user = me;
        roles = unique([...roles, ...extractRoles(me)]);
        permissions = normalizePermissionList([...permissions, ...extractPermissions(me)]);
      }
    } catch {
      // Keep payload fallback.
    }
  }

  if (!permissions.length && roles.length) {
    const resolved = await resolvePermissionsFromRoles(roles);
    permissions = normalizePermissionList([...permissions, ...resolved]);
  }

  return {
    user,
    roles,
    permissions,
    permissionSet: new Set(permissions),
  } satisfies AuthSession;
}

export async function getAuthSession(options?: { force?: boolean }) {
  const force = Boolean(options?.force);

  if (!force && inMemory) return inMemory;

  if (!force) {
    const cached = readCachedSession();
    if (cached) {
      inMemory = cached;
      return cached;
    }
  }

  if (!force && pending) return pending;

  pending = buildSession()
    .then((session) => {
      inMemory = session;
      saveCachedSession(session);
      return session;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function can(session: AuthSession | null | undefined, permission: string) {
  if (!session || !permission) return true;

  if (!session.permissions.length) return true;
  return session.permissionSet.has(normalizePermission(permission));
}

export function clearAuthSessionCache() {
  inMemory = null;
  pending = null;

  if (typeof window === "undefined") return;
  localStorage.removeItem(cacheKey);
}
