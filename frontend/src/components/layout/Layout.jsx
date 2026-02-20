import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="app-container">
      
      {/* Navbar */}
      <header className="app-header">
        <h1>Smart Health Management System</h1>
      </header>

      {/* Main Layout Body */}
      <div className="app-body">
        
        {/* Sidebar (later) */}
        <aside className="app-sidebar">
          {/* Navigation links will come here */}
        </aside>

        {/* Page Content */}
        <main className="app-content">
          <Outlet />
        </main>

      </div>

      {/* Footer (optional) */}
      <footer className="app-footer">
        © 2026 Smart Health App
      </footer>

    </div>
  );
}

export default Layout;