const API_BASE = 'http://localhost:8000';

export async function apiLogin(login: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export function getToken() {
  return localStorage.getItem('sprout_token');
}

export function getUser() {
  const u = localStorage.getItem('sprout_user');
  return u ? JSON.parse(u) : null;
}

export function saveSession(token: string, user: object) {
  localStorage.setItem('sprout_token', token);
  localStorage.setItem('sprout_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('sprout_token');
  localStorage.removeItem('sprout_user');
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}
