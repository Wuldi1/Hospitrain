import { handleUnauthorizedRedirect, isTokenValid } from '../utils/auth';
import { getApiBase } from '../utils/apiBase';

class ApiClient {
  constructor() {
    this.domain = getApiBase();
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const isPublicEndpoint = endpoint.startsWith('/api/auth') || endpoint.startsWith('/api/drills/public');

    if (!isPublicEndpoint && !isTokenValid(token)) {
      handleUnauthorizedRedirect();
      throw new Error('Unauthorized');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token && !isPublicEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.domain}${endpoint}`, {
      ...options,
      headers,
    });

    if ((response.status === 401 || response.status === 403) && !isPublicEndpoint) {
      handleUnauthorizedRedirect();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return response.json();
  }

  getHospitals() {
    return this.request('/api/hospitals');
  }

  createHospital(payload) {
    return this.request('/api/hospitals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getDrills() {
    return this.request('/api/drills');
  }

  requestCode(email) {
    return this.request('/api/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  verifyCode(email, code) {
    return this.request('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }
}

export default ApiClient;
