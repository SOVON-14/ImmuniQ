import { API_URL } from '../config';
import { kv } from './db';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role?: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function restoreSession() {
  accessToken = kv.get('access_token');
  refreshToken = kv.get('refresh_token');
  return !!accessToken;
}

function saveTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  kv.set('access_token', access);
  kv.set('refresh_token', refresh);
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  kv.remove('access_token');
  kv.remove('refresh_token');
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** true si l'erreur vient du réseau (pas du serveur) → mode hors ligne. */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof ApiError && e.status === 0);
}

export async function api<T = unknown>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Réseau indisponible');
  }

  if (res.status === 401 && retry) {
    if (await tryRefresh()) return api<T>(path, options, false);
    clearSession();
    throw new ApiError(401, 'Session expirée');
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });

export async function login(username: string, password: string, totpCode?: string) {
  const res = await post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/login', {
    username, password, totpCode,
  });
  saveTokens(res.accessToken, res.refreshToken);
  return res.user;
}

export async function logout() {
  try { await post('/auth/logout'); } finally { clearSession(); }
}
