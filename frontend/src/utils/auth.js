export function getToken() {
  return localStorage.getItem('authToken');
}

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(window.atob(padded));
  } catch (err) {
    return null;
  }
}

export function isTokenValid(token = getToken()) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 > Date.now();
}

export function clearToken() {
  localStorage.removeItem('authToken');
}

export function redirectToLogin() {
  const pathname = window.location.pathname;
  if (pathname !== '/login') {
    window.location.assign('/login');
  }
}

export function handleUnauthorizedRedirect() {
  clearToken();
  redirectToLogin();
}
