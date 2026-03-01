import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Welcome from "./pages/public/Welcome";
import Login from "./pages/public/Login";
import VerifyEmail from "./pages/public/VerifyEmail";
import ResetPassword from "./pages/public/ResetPassword";
import Dashboard from "./pages/dashboard/Dashboard";

import ProtectedRoutes from "./routes/ProtectedRoutes";
import CompleteProfile from "./pages/profile/CompleteProfile";

function App() {
  return (
    <>
      <ToastContainer />

      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

      </Routes>
    </>
  );
}

export default App;