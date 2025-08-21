import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ authenticated, children }) => {
  if (!authenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;