import api from "../services/api";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUserData = async () => {
    try {
      const { data } = await api.get("/user/me");

      if (data.success) {
        setUserData(data.userData);
        setIsLoggedIn(true);
        return data.userData;
      }

      return null;
    } catch (error) {
      // 401 means not logged in — not an error worth toasting
      if (error.response?.status === 401) {
        setIsLoggedIn(false);
        setUserData(null);
        return null;
      }

      toast.error(error.response?.data?.message || error.message);
      return null;
    }
  };

  // Single call on app load — replaces the old checkAuthStatus + getUserData chain
  useEffect(() => {
    getUserData().finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // still clear local state even if the request fails
    } finally {
      setIsLoggedIn(false);
      setUserData(null);
    }
  };

  const value = {
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData,
    logout, // shared logout function — fixes Fix 6
    loading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};