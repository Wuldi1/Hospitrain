import { handleUnauthorizedRedirect, isTokenValid } from '../utils/auth';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const isPublicEndpoint = path.startsWith('/api/drills/public');

  if (!isPublicEndpoint && !isTokenValid(token)) {
    handleUnauthorizedRedirect();
    throw new Error('Unauthorized');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !isPublicEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if ((response.status === 401 || response.status === 403) && !isPublicEndpoint) {
    handleUnauthorizedRedirect();
    throw new Error('Unauthorized');
  }

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

export function getTemplateBundle(templateId) {
  return request(`/api/templates/${templateId}`);
}

export function saveBakaraTemplate(templateId, payload) {
  return request(`/api/templates/${templateId}/bakara`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function saveScheduleTemplate(templateId, payload) {
  return request(`/api/templates/${templateId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
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

export function updateDrill(drillId, payload) {
  return request(`/api/drills/${drillId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
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

export function saveDrillSchedule(drillId, payload) {
  return request(`/api/drills/${drillId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getPublicDrill(drillId) {
  return request(`/api/drills/public/${drillId}`);
}

export function updatePublicRow(drillId, sheetId, rowId, data) {
  return request(`/api/drills/public/${drillId}/sheets/${sheetId}/rows/${rowId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
