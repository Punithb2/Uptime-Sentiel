import axios from 'axios';

export const api = axios.create({
  // Fallback to localhost if the variable is missing
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach the JWT token if it exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// NEW: Centralized 401 Unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Force redirect to login without triggering a React re-render cycle loop
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);