const API_BASE = '/api';

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('nexus-token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function login(email: string, password: string) {
  return fetchAPI<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string, name: string, role: string = 'COMPANY', companyName?: string) {
  return fetchAPI<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role, company_name: companyName }),
  });
}

export async function getMe() {
  return fetchAPI<any>('/auth/me');
}

export async function getAdminDashboard() {
  return fetchAPI<any>('/dashboard/admin');
}

export async function getCompanyDashboard(companyName: string) {
  return fetchAPI<any>(`/dashboard/company/${encodeURIComponent(companyName)}`);
}

export async function createShipment(data: any) {
  return fetchAPI<any>('/shipments/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getShipments(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '?limit=200';
  const res = await fetchAPI<any>(`/shipments/${qs}`);
  return Array.isArray(res) ? res : (res.items || []);
}

export async function searchShipments(q: string) {
  return fetchAPI<any[]>(`/shipments/search?q=${encodeURIComponent(q)}`);
}

export async function getShipment(id: string) {
  return fetchAPI<any>(`/shipments/${id}`);
}

export async function getShipmentTimeline(id: string) {
  return fetchAPI<any[]>(`/shipments/${id}/timeline`);
}

export async function getShipmentRisk(id: string) {
  return fetchAPI<any>(`/shipments/${id}/risk`);
}

export async function getShipmentDelay(id: string) {
  return fetchAPI<any>(`/shipments/${id}/delay`);
}

export async function getShipmentDocuments(id: string) {
  const res = await fetchAPI<any>(`/shipments/${id}/documents`);
  // Backend returns { documents: [...], discrepancies: [...] }
  return {
    documents: Array.isArray(res?.documents) ? res.documents : [],
    discrepancies: Array.isArray(res?.discrepancies) ? res.discrepancies : [],
  };
}

/**
 * Attach a document to an existing shipment.
 *
 * This bypasses `fetchAPI` deliberately: the endpoint consumes multipart form
 * data and `doc_type` is a *query* parameter, whereas `fetchAPI` always sets
 * `Content-Type: application/json`. Letting the browser set the multipart
 * boundary is required.
 */
export async function uploadShipmentDocument(id: string, docType: string, file: File) {
  const body = new FormData();
  body.append('file', file);

  const token = localStorage.getItem('nexus-token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(
    `${API_BASE}/shipments/${encodeURIComponent(id)}/documents?doc_type=${encodeURIComponent(docType)}`,
    { method: 'POST', headers, body }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: null }));
    const detail = typeof err?.detail === 'string' ? err.detail : null;
    throw new Error(detail || `Upload failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function getDisruptions() {
  return fetchAPI<any[]>('/disruptions/');
}

export async function getExceptions() {
  return fetchAPI<any[]>('/exceptions/');
}

export async function getAlerts() {
  return fetchAPI<any[]>('/alerts/');
}

export async function getInsights() {
  return fetchAPI<any[]>('/insights/');
}

export async function getNetworkHubs() {
  return fetchAPI<any[]>('/network/hubs');
}

export async function getMetrics() {
  return fetchAPI<any>('/metrics/');
}

export async function aiQuery(question: string, shipmentId?: string) {
  return fetchAPI<any>('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ question, shipment_id: shipmentId || null }),
  });
}
