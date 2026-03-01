import { useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../../context/AppContext";

const Navbar = () => {
  const { userData, setIsLoggedIn, setUserData, backendUrl } =
    useContext(AppContext);

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${backendUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );

      setIsLoggedIn(false);
      setUserData(null);
      navigate("/login", { replace: true });

    } catch (error) {
      console.error(error);
    }
  };

  const navLinkStyle = ({ isActive }) =>
    `px-4 py-2 rounded-md transition ${
      isActive
        ? "bg-blue-100 text-blue-600 font-semibold"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <nav className="bg-white shadow-md px-8 py-4 flex justify-between items-center">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-8">

        {/* Logo */}
        <NavLink
          to="/app/dashboard"
          className="text-xl font-bold text-blue-600"
        >
          Smart Health
        </NavLink>

        {/* Navigation Links */}
        <div className="flex gap-2">
          <NavLink to="/app/dashboard" className={navLinkStyle}>
            Dashboard
          </NavLink>

          <NavLink to="/app/chatbot" className={navLinkStyle}>
            Chatbot
          </NavLink>

          <NavLink to="/app/reports" className={navLinkStyle}>
            Reports
          </NavLink>
        </div>

      </div>

      {/* RIGHT SECTION - PROFILE */}
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer font-semibold">
          {userData?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        {isOpen && (
          <div className="absolute right-0 w-44 bg-white border rounded-lg shadow-lg z-50">

            <button
              onClick={() => navigate("/app/profile")}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              View Profile
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            >
              Logout
            </button>

          </div>
        )}
      </div>

    </nav>
  );
};

export default Navbar;