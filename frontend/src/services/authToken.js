const AUTH_TOKEN_KEY = "smartHealthAuthToken";

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const saveAuthToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};
