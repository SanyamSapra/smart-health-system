import axios from "axios";
import { BACKEND_URL } from "./config";
import { getAuthToken } from "./authToken";

// Shared axios instance for all API requests
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true, // allows cookies (httpOnly auth cookie)
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle global API errors like expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optional: redirect user to login if session expires
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
