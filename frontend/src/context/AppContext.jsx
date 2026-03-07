import api from "../services/api";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch currently logged-in user's data
  const getUserData = async () => {
    try {
      const { data } = await api.get("/user/me");

      if (data.success) {
        setUserData(data.userData);
        return data.userData;
      }

      return null;

    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.status === 404
      ) {
        setUserData(null);
        return null;
      }

      toast.error(error.response?.data?.message || error.message);
      return null;
    }
  };

  // Check authentication status when the app loads
  const checkAuthStatus = async () => {
    try {
      const { data } = await api.get("/auth/is-auth");

      if (data.success) {
        const user = await getUserData();
        setIsLoggedIn(!!user);
      } else {
        setIsLoggedIn(false);
      }

    } catch (error) {
      // If request fails, assume user is not logged in
      setIsLoggedIn(false);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData,
    loading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};