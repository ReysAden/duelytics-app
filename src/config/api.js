// Centralized API configuration
// Uses environment variable or defaults to production Railway URL

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://duelytics-app-production.up.railway.app';

export const API_URL = `${API_BASE_URL}/api`;

// Helper to construct full API endpoint URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_URL}/${cleanEndpoint}`;
};

export default API_URL;
