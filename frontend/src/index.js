import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Hospitals from './pages/Hospitals';
import Drills from './pages/Drills';
import NewDrillPage from './pages/NewDrillPage';
import DrillEditorPage from './pages/DrillEditorPage';
import PublicTesterPage from './pages/PublicTesterPage';
import TemplatesPage from './pages/TemplatesPage';
import Profiles from './pages/Profiles';
import Settings from './pages/Settings';
import './index.css';
import theme from './theme';
import { isTokenValid, clearToken } from './utils/auth';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isPublicPage = location.pathname.startsWith('/public/');
  const isLoginPage = location.pathname === '/login';

  if (isPublicPage || isLoginPage) {
    return children;
  }

  if (!isTokenValid()) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <ProtectedRoute>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<Home />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/drills" element={<Drills />} />
            <Route path="/drills/new" element={<NewDrillPage />} />
            <Route path="/drills/:drillId/edit" element={<DrillEditorPage />} />
            <Route path="/public/:drillId" element={<PublicTesterPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Layout>
      </ProtectedRoute>
    </Router>
  </ThemeProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
