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
