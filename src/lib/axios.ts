import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  // const token = localStorage.getItem('token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle specific status codes globally
      switch (status) {
        case 401:
          console.error('Unauthorized - redirecting to login');
          // window.location.href = '/login';
          break;
        case 403:
          console.error('Forbidden');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error(`API Error ${status}:`, data);
      }
    } else if (error.request) {
      console.error('Network error - no response');
    } else {
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);