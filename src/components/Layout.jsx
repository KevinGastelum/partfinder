
import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <header className="header glass-panel">
        <div className="container header-content">
          <div className="logo">
            <span className="text-gradient">Part</span>Finder
          </div>
          <nav className="nav-desktop">
             {/* Desktop nav placeholders, we focus on mobile first */}
             <button className="btn btn-ghost">Search</button>
             <button className="btn btn-ghost">Cart</button>
          </nav>
        </div>
      </header>
      
      <main className="main-content">
        {children}
      </main>

      <nav className="mobile-nav glass-panel">
        <button className="nav-item active">
          <span className="icon">🔍</span>
          <span className="label">Search</span>
        </button>
        <button className="nav-item">
          <span className="icon">🛒</span>
          <span className="label">Cart</span>
        </button>
        <button className="nav-item">
          <span className="icon">👤</span>
          <span className="label">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
