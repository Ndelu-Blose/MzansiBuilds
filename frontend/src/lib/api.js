import axios from 'axios';
import { getBackendOrigin } from './backendUrl';
import { supabase } from './supabase';

const backendOrigin = getBackendOrigin();

if (process.env.NODE_ENV === 'production' && !backendOrigin) {
  // Relative /api on the SPA host (e.g. Vercel) is not the FastAPI app — often 405/404 on POST.
  console.error(
    '[MzansiBuilds] REACT_APP_BACKEND_URL is not set in this production build. API calls use same-origin /api, which usually fails for POST routes. Set REACT_APP_BACKEND_URL to your Railway (or other) API origin, e.g. https://your-service.up.railway.app'
  );
}

// Create axios instance with interceptor for auth
const api = axios.create({
  baseURL: backendOrigin ? `${backendOrigin}/api` : '/api',
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
  } catch (_error) {
    // Supabase error - continue without token, cookies may work
    console.debug('No Supabase session, using cookies');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 405) {
      const cfg = error.config || {};
      const base = (cfg.baseURL || '').replace(/\/$/, '');
      const path = String(cfg.url || '').replace(/^\//, '');
      const resolved = base && path ? `${base}/${path}` : base || path || '(unknown)';
      const hdrs = error.response.headers || {};
      const server = hdrs.server || hdrs.Server;
      const via = hdrs.via || hdrs.Via;
      console.error(
        '[MzansiBuilds API] 405 Method Not Allowed —',
        resolved,
        `(${String(cfg.method || 'GET').toUpperCase()}).`,
        'FastAPI defines these routes as POST; 405 here usually means the request did not reach that app (wrong host, static CDN, or proxy).',
        [server && `server=${server}`, via && `via=${via}`].filter(Boolean).join(' ') || '(no Server/Via headers)'
      );
    }
    return Promise.reject(error);
  }
);

// Projects API
export const projectsAPI = {
  list: (params = {}) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  createManual: (data) => api.post('/projects/manual', data),
  importFromGithub: (data) => api.post('/projects/import/github', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  complete: (id) => api.patch(`/projects/${id}/complete`),
  delete: (id) => api.delete(`/projects/${id}`),
  refresh: (id) => api.post(`/projects/${id}/refresh`),
  getMyProjects: (params = {}) => api.get('/my/projects', { params })
};

export const githubAPI = {
  connectStart: () => api.post('/integrations/github/connect/start'),
  getAccount: () => api.get('/integrations/github/account'),
  disconnect: () => api.delete('/integrations/github/account'),
  listRepos: (params = {}) => api.get('/integrations/github/repos', { params }),
  repoLanguages: (repoId) => api.get(`/integrations/github/repos/${repoId}/languages`),
  repoReadmeSummary: (repoId) => api.get(`/integrations/github/repos/${repoId}/readme-summary`),
};

// Project Updates API
export const updatesAPI = {
  list: (projectId, params = {}) => api.get(`/projects/${projectId}/updates`, { params }),
  create: (projectId, data) => api.post(`/projects/${projectId}/updates`, data),
  update: (projectId, updateId, data) => api.patch(`/projects/${projectId}/updates/${updateId}`, data),
  delete: (projectId, updateId) => api.delete(`/projects/${projectId}/updates/${updateId}`),
};

// Milestones API
export const milestonesAPI = {
  list: (projectId) => api.get(`/projects/${projectId}/milestones`),
  create: (projectId, data) => api.post(`/projects/${projectId}/milestones`, data),
  update: (projectId, milestoneId, data) => api.patch(`/projects/${projectId}/milestones/${milestoneId}`, data)
};

export const activityAPI = {
  list: (projectId) => api.get(`/projects/${projectId}/activity`)
};

// Comments API
export const commentsAPI = {
  list: (projectId, params = {}) => api.get(`/projects/${projectId}/comments`, { params }),
  create: (projectId, data) => api.post(`/projects/${projectId}/comments`, data),
  delete: (projectId, commentId) => api.delete(`/projects/${projectId}/comments/${commentId}`),
};

// Notifications API
export const notificationsAPI = {
  list: (params = {}) => api.get('/notifications', { params }),
  markRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
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
