import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Welcome from "./pages/public/Welcome";
import Login from "./pages/public/Login";
import ResetPassword from "./pages/public/ResetPassword";
import VerifyEmail from "./pages/public/VerifyEmail";

import Dashboard from "./pages/dashboard/Dashboard";
import CompleteProfile from "./pages/profile/CompleteProfile";
import Chatbot from "./pages/chatbot/Chatbot";
import Reports from "./pages/reports/Reports";

import Layout from "./components/layout/Layout";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import ProfileView from "./pages/profile/ProfileView";


function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Wrapper */}
        <Route element={<ProtectedRoutes />}>

          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* App Layout */}
          <Route path="/app" element={<Layout />}>
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<ProfileView />} />
          </Route>

        </Route>
      </Routes>
    </>
  );
}

export default App;