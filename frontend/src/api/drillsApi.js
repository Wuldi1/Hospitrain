const API_BASE = process.env.REACT_APP_API_DOMAIN || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'API request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getTemplates() {
  return request('/api/templates');
}

export function getTemplate(templateId) {
  return request(`/api/templates/${templateId}`);
}

export function createDrill(payload) {
  return request('/api/drills', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDrill(drillId) {
  return request(`/api/drills/${drillId}`);
}

export function updateSheet(drillId, sheetId, data) {
  return request(`/api/drills/${drillId}/sheets/${sheetId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function addSheet(drillId, payload = {}) {
  return request(`/api/drills/${drillId}/sheets`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteSheet(drillId, sheetId) {
  return request(`/api/drills/${drillId}/sheets/${sheetId}`, {
    method: 'DELETE',
  });
}

export function addRow(drillId, sheetId, payload = {}) {
  return request(`/api/drills/${drillId}/sheets/${sheetId}/rows`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRow(drillId, sheetId, rowId, data) {
  return request(`/api/drills/${drillId}/sheets/${sheetId}/rows/${rowId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteRow(drillId, sheetId, rowId) {
  return request(`/api/drills/${drillId}/sheets/${sheetId}/rows/${rowId}`, {
    method: 'DELETE',
  });
}
