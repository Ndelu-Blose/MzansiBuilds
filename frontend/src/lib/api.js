import axios from 'axios';
import { supabase } from './supabase';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Create axios instance with interceptor for auth
const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    // Note: If no Supabase session, cookies will handle legacy auth
  } catch (error) {
    // Supabase error - continue without token, cookies may work
    console.debug('No Supabase session, using cookies');
  }
  return config;
});

// Projects API
export const projectsAPI = {
  list: (params = {}) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  complete: (id) => api.patch(`/projects/${id}/complete`),
  delete: (id) => api.delete(`/projects/${id}`),
  getMyProjects: (params = {}) => api.get('/my/projects', { params })
};

// Project Updates API
export const updatesAPI = {
  list: (projectId, params = {}) => api.get(`/projects/${projectId}/updates`, { params }),
  create: (projectId, data) => api.post(`/projects/${projectId}/updates`, data)
};

// Milestones API
export const milestonesAPI = {
  list: (projectId) => api.get(`/projects/${projectId}/milestones`),
  create: (projectId, data) => api.post(`/projects/${projectId}/milestones`, data),
  update: (milestoneId, data) => api.patch(`/milestones/${milestoneId}`, data)
};

// Comments API
export const commentsAPI = {
  list: (projectId, params = {}) => api.get(`/projects/${projectId}/comments`, { params }),
  create: (projectId, data) => api.post(`/projects/${projectId}/comments`, data)
};

// Collaboration API
export const collaborationAPI = {
  request: (projectId, data) => api.post(`/projects/${projectId}/collaborate`, data),
  list: (projectId) => api.get(`/projects/${projectId}/collaborators`),
  update: (collabId, data) => api.patch(`/collaborations/${collabId}`, data),
  getMyRequests: () => api.get('/my/collaboration-requests')
};

// Profile API
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  getUser: (userId) => api.get(`/users/${userId}/profile`)
};

// Feed API
export const feedAPI = {
  get: (params = {}) => api.get('/feed', { params })
};

// Celebration Wall API
export const celebrationAPI = {
  get: (params = {}) => api.get('/celebration', { params })
};

export default api;
