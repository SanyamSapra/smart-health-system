import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

    </div>
  );
};

export default Layout;
