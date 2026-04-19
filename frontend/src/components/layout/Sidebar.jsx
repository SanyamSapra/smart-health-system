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
      className={`fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full flex-row border-t border-gray-200 bg-white transition-all duration-300 md:relative md:h-screen md:flex-col md:border-r md:border-t-0 ${collapsed ? "md:w-16" : "md:w-56"
        }`}
    >
      {/* Logo + collapse toggle */}
      <div className="hidden items-center justify-between border-b border-gray-100 px-4 py-5 md:flex">
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
        <div className="hidden border-b border-gray-100 px-4 py-4 md:block">
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
        <div className="hidden justify-center border-b border-gray-100 py-4 md:flex">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {avatarLetter}
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="grid flex-1 grid-cols-4 gap-1 overflow-x-auto px-2 py-2 md:block md:space-y-1 md:overflow-y-auto md:py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-all md:min-h-0 md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                } ${collapsed ? "md:justify-center" : ""}`
              }
              title={collapsed ? item.label : ""}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className={`text-center leading-tight md:text-left ${collapsed ? "md:hidden" : ""}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="hidden border-t border-gray-100 px-2 py-4 md:block">
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
