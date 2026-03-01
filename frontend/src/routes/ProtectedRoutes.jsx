import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const ProtectedRoutes = () => {
  const { isLoggedIn, userData, loading } = useContext(AppContext);
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // If email not verified
  if (!userData?.isAccountVerified) {
    if (location.pathname !== "/verify-email") {
      return <Navigate to="/verify-email" replace />;
    }
  }

  // If profile not completed
  if (userData?.isAccountVerified && !userData?.profileCompleted) {
    if (location.pathname !== "/complete-profile") {
      return <Navigate to="/complete-profile" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoutes;