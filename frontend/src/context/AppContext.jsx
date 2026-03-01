import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {

    axios.defaults.withCredentials = true;

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true); // important

    // Fetch current logged-in user data
    const getUserData = async () => {
        try {
            const { data } = await axios.get(
                `${backendUrl}/api/user/me`
            );

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
                // Session expired or user deleted
                setUserData(null);
                return null;
            }

            toast.error(
                error.response?.data?.message || error.message
            );

            return null;
        }
    };

    // Check authentication state on app load
    const getAuthState = async () => {
        try {
            const { data } = await axios.get(
                `${backendUrl}/api/auth/is-auth`
            );

            if (data.success) {
                const user = await getUserData();

                if (user) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            } else {
                setIsLoggedIn(false);
            }

        } catch (error) {
            setIsLoggedIn(false);
            setUserData(null);
        } finally {
            setLoading(false); // stop loading
        }
    };

    useEffect(() => {
        getAuthState();
    }, []);

    const value = {
        backendUrl,
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        getUserData,
        loading
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};