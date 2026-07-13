const BASE_URL = '';

export interface ApiResponseWrapper<T> {
  data: T;
  port: string;
}

export const api = {
  getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const token = window.sessionStorage.getItem('admin_token');
    const role = window.sessionStorage.getItem('admin_role') || 'ADMINISTRATOR';
    const userId = window.sessionStorage.getItem('admin_user_id') || '';
    const userPhone = window.sessionStorage.getItem('admin_phone') || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-User-Role'] = role;
      if (userId) {
        headers['X-User-Id'] = userId;
      }
      if (userPhone) {
        headers['X-User-Phone'] = userPhone;
      }
    }

    return headers;
  },

  async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return null as unknown as T;
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof data === 'string' 
        ? data 
        : (data.message || `Request failed with status ${response.status}`);
      throw new Error(errorMessage);
    }

    return data as T;
  },

  async get<T>(path: string, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: api.getHeaders(customHeaders),
    });
    return api.handleResponse<T>(response);
  },

  async post<T>(path: string, body: any, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: api.getHeaders(customHeaders),
      body: JSON.stringify(body),
    });
    return api.handleResponse<T>(response);
  },

  async put<T>(path: string, body: any, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: api.getHeaders(customHeaders),
      body: JSON.stringify(body),
    });
    return api.handleResponse<T>(response);
  },

  async delete<T>(path: string, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: api.getHeaders(customHeaders),
    });
    return api.handleResponse<T>(response);
  }
};
