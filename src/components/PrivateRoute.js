// src/components/PrivateRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const PrivateRoute = () => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  // Only set redirect flag once authentication check is complete
  useEffect(() => {
    if (!loading) {
      setShouldRedirect(!isAuthenticated);
    }
  }, [isAuthenticated, loading]);
  
  // Show loading indicator while checking auth
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px'
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Verifying authentication...
        </Typography>
      </Box>
    );
  }
  
  // Prevent redirecting during loading state
  if (shouldRedirect) {
    // Use the state property to remember where user was trying to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Make sure we have a user object before rendering child routes
  if (!currentUser) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px'
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading user data...
        </Typography>
      </Box>
    );
  }
  
  // Render the protected content
  return <Outlet />;
};

export default PrivateRoute;