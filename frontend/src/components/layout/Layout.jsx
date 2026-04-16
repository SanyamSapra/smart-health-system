import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen overflow-y-auto">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 transition"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="text-lg font-semibold text-slate-900">Smart Health</div>
          <div className="w-10" />
        </header>

        <main className="min-h-screen p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
