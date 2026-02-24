import {
  Assignment,
  Description,
  Home,
  LocalHospital,
} from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <BottomNavigation
      value={location.pathname}
      onChange={(event, newValue) => navigate(newValue)}
      showLabels
      sx={{
        width: "100%",
        position: "fixed",
        bottom: 0,
        right: 0,
        left: 0,
        borderTop: "1px solid rgba(21,101,192,0.16)",
        boxShadow: "0 -8px 24px rgba(20, 72, 83, 0.12)",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
        direction: "rtl",
        "& .Mui-selected": {
          color: "#1565C0",
          fontWeight: 700,
        },
        "& .MuiBottomNavigationAction-root": {
          minWidth: "auto",
          padding: "6px 0 8px",
        },
      }}
    >
      <BottomNavigationAction label="דף הבית" value="/home" icon={<Home />} />
      <BottomNavigationAction
        label="בתי חולים"
        value="/hospitals"
        icon={<LocalHospital />}
      />
      <BottomNavigationAction
        label="תרגילים"
        value="/drills"
        icon={<Assignment />}
      />
      <BottomNavigationAction
        label="תבניות"
        value="/templates"
        icon={<Description />}
      />
      {/* <BottomNavigationAction
        label="פרופיל"
        value="/profiles"
        icon={<AccountCircle />}
      /> */}
      {/* <BottomNavigationAction
        label="הגדרות"
        value="/settings"
        icon={<Settings />}
      /> */}
    </BottomNavigation>
  );
};

export default BottomNavBar;
