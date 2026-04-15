import { useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

const Sidebar = () => {
  const { userData, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const navItems = [
    { path: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/app/chatbot", icon: Bot, label: "AI Assistant" },
    { path: "/app/reports", icon: FolderOpen, label: "Reports" },
    { path: "/app/profile", icon: User, label: "Profile" },
  ];

  const avatarLetter = userData?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-56"
        }`}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        {!collapsed && (
          <span className="text-blue-600 font-bold text-base">Smart Health</span>
        )}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="text-gray-400 hover:text-gray-600 transition ml-auto"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User info — expanded */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {avatarLetter}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {userData?.name || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {userData?.email || ""}
              </p>
            </div>
          </div>

          {!userData?.isAccountVerified && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-yellow-500 shrink-0" />
              <p className="text-xs text-yellow-600">Email not verified</p>
            </div>
          )}
        </div>
      )}

      {/* Avatar — collapsed */}
      {collapsed && (
        <div className="flex justify-center py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {avatarLetter}
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                } ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? item.label : ""}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all ${collapsed ? "justify-center" : ""
            }`}
          title={collapsed ? "Logout" : ""}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
