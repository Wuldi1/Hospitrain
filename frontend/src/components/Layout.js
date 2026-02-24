import React from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useLocation } from 'react-router-dom';
import SideNavBar from './SideNavBar';
import BottomNavBar from './BottomNavBar';

const Layout = ({ children }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';
  const isPublicPage = location.pathname.startsWith('/public');

  return (
    <div className="app-layout">
      {!isLoginPage && !isPublicPage && !isMobile && (
          <SideNavBar />
      )}
      <main className="app-main">
        {children}
      </main>
      {!isLoginPage && !isPublicPage && isMobile && (
        <div>
          <BottomNavBar />
        </div>
      )}
    </div>
  );
};

export default Layout;
