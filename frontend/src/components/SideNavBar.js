import DescriptionIcon from "@mui/icons-material/Description";
import EventNoteIcon from "@mui/icons-material/EventNote";
import HomeIcon from "@mui/icons-material/Home";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const drawerWidth = 240;
const NAV_COLOR = "#1565C0";

export default function SideNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const items = [
    { key: "home", text: "דף הבית", icon: <HomeIcon />, to: "/home" },
    {
      key: "hospitals",
      text: "בתי חולים",
      icon: <LocalHospitalIcon />,
      to: "/hospitals",
    },
    { key: "drills", text: "תרגילים", icon: <EventNoteIcon />, to: "/drills" },
    {
      key: "templates",
      text: "תבניות",
      icon: <DescriptionIcon />,
      to: "/templates",
    },
    // { key: 'profile', text: 'פרופיל', icon: <PersonIcon />, to: '/profiles' },
    // { key: 'settings', text: 'הגדרות', icon: <SettingsIcon />, to: '/settings' },
  ];

  const handleNavigate = (to) => navigate(to);

  const handleLogout = () => {
    try {
      localStorage.removeItem("authToken");
    } catch (e) {
      /* ignore */
    }
    navigate("/login");
  };

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "none",
          background: "linear-gradient(180deg, #ffffff 0%, #f5fcfa 100%)",
          borderLeft: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          direction: "rtl",
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 3,
          display: "flex",
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Avatar sx={{ bgcolor: NAV_COLOR, width: 56, height: 56 }}>ה</Avatar>
        <Box
          sx={{ display: "flex", flexDirection: "column", textAlign: "right" }}
        >
          <Typography variant="h6" sx={{ color: NAV_COLOR, fontWeight: 700 }}>
            Hospitrain
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ניהול מוכנות בריאות
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ p: 1, direction: "rtl" }}>
        {items.map((it) => (
          <ListItemButton
            key={it.key}
            selected={location.pathname === it.to}
            onClick={() => handleNavigate(it.to)}
            sx={{
              flexDirection: "row-reverse",
              justifyContent: "flex-start",
              textAlign: "right",
              borderRadius: 1,
              mb: 0.5,
              py: 1,
              "& .MuiListItemText-root .MuiTypography-root": {
                textAlign: "right",
              },
              "&.Mui-selected": {
                bgcolor: "rgba(21,101,192,0.12)",
                "& .MuiListItemText-root .MuiTypography-root": {
                  fontWeight: 700,
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: NAV_COLOR,
                minWidth: "auto",
                marginInlineStart: 12,
                marginInlineEnd: 0,
                justifyContent: "center",
              }}
            >
              {it.icon}
            </ListItemIcon>
            <ListItemText primary={it.text} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ p: 1 }}>
        <Divider />
        <List>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              mt: 1,
              flexDirection: "row-reverse",
              textAlign: "right",
              "& .MuiListItemText-root .MuiTypography-root": {
                textAlign: "right",
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: NAV_COLOR,
                minWidth: "auto",
                marginInlineStart: 12,
                marginInlineEnd: 0,
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="התנתק" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}
