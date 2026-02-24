const DEV_FRONTEND_URL = 'https://app-hospitrain-fe-dev.azurewebsites.net';
const DEV_BACKEND_URL = 'https://app-hospitrain-be-dev.azurewebsites.net';

export function getApiBase() {
  if (process.env.REACT_APP_API_DOMAIN) {
    return process.env.REACT_APP_API_DOMAIN;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }

    if (origin === DEV_FRONTEND_URL || hostname.endsWith('.azurewebsites.net')) {
      return DEV_BACKEND_URL;
    }
  }

  return DEV_BACKEND_URL;
}

export { DEV_FRONTEND_URL, DEV_BACKEND_URL };
