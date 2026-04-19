import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 md:flex-row">

      <Sidebar />

      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </div>

    </div>
  );
};

export default Layout;
