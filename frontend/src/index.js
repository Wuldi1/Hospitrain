import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Hospitals from './pages/Hospitals';
import Drills from './pages/Drills';
import NewDrillPage from './pages/NewDrillPage';
import DrillEditorPage from './pages/DrillEditorPage';
import Profiles from './pages/Profiles';
import Settings from './pages/Settings';
import './index.css';

const App = () => (
  <Router>
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/drills" element={<Drills />} />
        <Route path="/drills/new" element={<NewDrillPage />} />
        <Route path="/drills/:drillId/edit" element={<DrillEditorPage />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  </Router>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
