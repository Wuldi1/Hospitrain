class ApiClient {
  constructor() {
    // domain will be fetched from environment variables or defaults
    this.domain = process.env.REACT_APP_API_DOMAIN || 'http://localhost:4000';
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token && !endpoint.startsWith('/api/auth')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.domain}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return response.json();
  }

  getHospitals() {
    return this.request('/api/hospitals');
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