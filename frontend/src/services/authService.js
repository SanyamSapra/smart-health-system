import api from "./api";

export const registerUser = async (data) => {
  return await api.post("/auth/register", data);
};

export const loginUser = async (data) => {
  return await api.post("/auth/login", data);
};

export const verifyEmail = async (data) => {
  return await api.post("/auth/verify-email", data);
};

export const resetPassword = async (data) => {
  return await api.post("/auth/reset-password", data);
};