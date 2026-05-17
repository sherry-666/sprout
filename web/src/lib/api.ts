export const Role = {
  SuperAdmin: 'super_admin',
  Admin: 'admin',
  Educator: 'educator',
  Parent: 'parent',
} as const;

export type RoleValue = typeof Role[keyof typeof Role];

export function isRole(role: RoleValue) {
  return getUser()?.role === role;
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
