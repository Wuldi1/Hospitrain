import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Box,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DescriptionIcon from '@mui/icons-material/Description';

const drawerWidth = 240;
const NAV_COLOR = '#166CC7';

export default function SideNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const items = [
    { key: 'home', text: 'דף הבית', icon: <HomeIcon />, to: '/home' },
    { key: 'hospitals', text: 'בתי חולים', icon: <LocalHospitalIcon />, to: '/hospitals' },
    { key: 'drills', text: 'תרגילים', icon: <EventNoteIcon />, to: '/drills' },
    { key: 'templates', text: 'תבניות', icon: <DescriptionIcon />, to: '/templates' },
    { key: 'profile', text: 'פרופיל', icon: <PersonIcon />, to: '/profile' },
    { key: 'settings', text: 'הגדרות', icon: <SettingsIcon />, to: '/settings' },
  ];

  const handleNavigate = (to) => navigate(to);

  const handleLogout = () => {
    try {
      localStorage.removeItem('authToken');
    } catch (e) {
      /* ignore */
    }
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: 'none',
          background: theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ px: 2, py: 3, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Avatar sx={{ bgcolor: NAV_COLOR, width: 56, height: 56 }}>ה</Avatar>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ color: NAV_COLOR, fontWeight: 600 }}>הצוות שלי</Typography>
          <Typography variant="caption" color="text.secondary">ניהול תרגילים ומרכז</Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ p: 1 }}>
        {items.map((it) => (
          <ListItemButton
            key={it.key}
            selected={location.pathname === it.to}
            onClick={() => handleNavigate(it.to)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(22,108,199,0.08)',
              },
            }}
          >
            <ListItemIcon sx={{ color: NAV_COLOR }}>{it.icon}</ListItemIcon>
            <ListItemText primary={it.text} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ p: 1 }}>
        <Divider />
        <List>
          <ListItemButton onClick={handleLogout} sx={{ mt: 1 }}>
            <ListItemIcon sx={{ color: NAV_COLOR }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="התנתק" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}
