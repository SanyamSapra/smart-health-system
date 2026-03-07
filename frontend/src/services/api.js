import axios from "axios";

// Shared axios instance for all API requests
const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
  withCredentials: true, // allows cookies (httpOnly auth cookie)
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