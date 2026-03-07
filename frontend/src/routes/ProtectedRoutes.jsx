import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const ProtectedRoutes = () => {
  const { isLoggedIn, userData, loading } = useContext(AppContext);
  const location = useLocation();

  // FIXED: replaced plain "Loading..." text with a centered spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Email not verified — force to verify page
  if (!userData?.isAccountVerified) {
    if (location.pathname !== "/verify-email") {
      return <Navigate to="/verify-email" replace />;
    }
  }

  // Profile not completed — force to complete-profile page
  if (userData?.isAccountVerified && !userData?.profileCompleted) {
    if (location.pathname !== "/complete-profile") {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoutes;