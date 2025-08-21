import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/main.css';

// Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import TrafficDashboard from './components/traffic/TrafficDashboard';
import RouteDashboard from './components/routes/RouteDashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Profile from './components/auth/Profile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotFound from './components/common/NotFound';

// API Services
import { authApi } from './api/api-service';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(authApi.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(authApi.getCurrentUser());

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle login
  const handleLogin = (userData) => {
    setAuthenticated(true);
    setCurrentUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    authApi.logout();
    setAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <Header 
          toggleSidebar={toggleSidebar} 
          authenticated={authenticated} 
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        <div className="content-container">
          {authenticated && (
            <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />
          )}
          
          <main className={`main-content ${authenticated && sidebarOpen ? 'sidebar-open' : ''}`}>
            <Container fluid>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={
                  authenticated ? 
                    <Navigate to="/dashboard/traffic" replace /> : 
                    <Login onLogin={handleLogin} />
                } />
                <Route path="/register" element={
                  authenticated ? 
                    <Navigate to="/dashboard/traffic" replace /> : 
                    <Register />
                } />
                
                {/* Protected Routes */}
                <Route path="/" element={<Navigate to="/dashboard/traffic" replace />} />
                <Route path="/dashboard" element={<Navigate to="/dashboard/traffic" replace />} />
                <Route path="/dashboard/traffic" element={
                  <ProtectedRoute authenticated={authenticated}>
                    <TrafficDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/routes" element={
                  <ProtectedRoute authenticated={authenticated}>
                    <RouteDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute authenticated={authenticated}>
                    <Profile currentUser={currentUser} setCurrentUser={setCurrentUser} />
                  </ProtectedRoute>
                } />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Container>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;