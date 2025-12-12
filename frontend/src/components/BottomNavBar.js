import React from 'react';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Home, LocalHospital, Assignment, AccountCircle, Settings } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <BottomNavigation
      value={location.pathname}
      onChange={(event, newValue) => navigate(newValue)}
      showLabels
      sx={{
        width: '100%',
        position: 'fixed',
        bottom: 0,
        borderTop: '1px solid #e0e0e0',
        boxShadow: '0px -2px 10px rgba(0,0,0,0.05)',
        zIndex: 1000,
        '& .Mui-selected': {
          color: '#166CC7',
        },
        '& .MuiBottomNavigationAction-root': {
          minWidth: 'auto',
          padding: '6px 0',
        }
      }}
    >
      <BottomNavigationAction label="דף הבית" value="/home" icon={<Home />} />
      <BottomNavigationAction label="בתי חולים" value="/hospitals" icon={<LocalHospital />} />
      <BottomNavigationAction label="תרגילים" value="/drills" icon={<Assignment />} />
      <BottomNavigationAction label="מתארים" value="/profiles" icon={<AccountCircle />} />
      <BottomNavigationAction label="הגדרות" value="/settings" icon={<Settings />} />
    </BottomNavigation>
  );
};

export default BottomNavBar;