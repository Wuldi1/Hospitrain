import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Assistant", "Rubik", "Heebo", "Segoe UI", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 750,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#1565C0',
      light: '#42A5F5',
      dark: '#0D47A1',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1E88E5',
      light: '#64B5F6',
      dark: '#1565C0',
    },
    success: {
      main: '#2F80ED',
    },
    warning: {
      main: '#EF8F3C',
    },
    error: {
      main: '#C44536',
    },
    background: {
      default: '#F2F7FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#102A43',
      secondary: '#486581',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(circle at 12% 8%, rgba(100,181,246,0.22), transparent 42%), radial-gradient(circle at 88% 18%, rgba(21,101,192,0.18), transparent 40%), linear-gradient(180deg, #f8fbff 0%, #eef4fd 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 14px 34px rgba(17, 52, 61, 0.08)',
          border: '1px solid rgba(20, 72, 83, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(20, 72, 83, 0.08)',
          boxShadow: '0 10px 28px rgba(17, 52, 61, 0.07)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 18,
        },
      },
    },
  },
});

export default theme;
