import React from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useLocation } from 'react-router-dom';
import SideNavBar from './SideNavBar';
import BottomNavBar from './BottomNavBar';

const Layout = ({ children }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="layout position-sticky" style={{ display: 'flex', flexDirection: 'row', height: '100vh' }}>
      {!isLoginPage && !isMobile && (
          <SideNavBar />
      )}
      <main className="page-container" style={{ flexGrow: 1, overflow: 'auto' }}>
        {children}
      </main>
      {!isLoginPage && isMobile && (
        <div style={{ position: 'fixed', bottom: 0, width: '100%' }}>
          <BottomNavBar />
        </div>
      )}
    </div>
  );
};

export default Layout;