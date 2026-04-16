import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Bot,
  LogOut,
  AlertTriangle,
  X,
} from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const { userData, logout } = useContext(AppContext);
  const navigate = useNavigate();

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
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} w-64`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
          <span className="text-blue-600 font-bold text-base">Smart Health</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
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
                  }`
                }
                onClick={onClose}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-2 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
    </>
  );
};

export default Sidebar;
