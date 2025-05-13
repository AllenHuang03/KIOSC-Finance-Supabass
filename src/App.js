// src/App.js - Updated with new authentication routes
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExpenseManagement from './pages/ExpenseManagement';
import SupplierManagement from './pages/SupplierManagement';
import JournalEntry from './pages/JournalEntry';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// New Authentication Pages
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Components
import SupabaseSetup from './components/SupabaseSetup';
import SupabaseDebug from './components/SupabaseDebug';
import ConnectionTest from './components/ConnectionTest';
import ApiKeyTest from './components/ApiKeyTest';
import ProjectStatusCheck from './components/ProjectStatusCheck';
import DatabaseSetup from './components/DatabaseSetup';


// Improved Private Route Component
const PrivateRoute = () => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  
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
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Render the outlet (child routes)
  return <Outlet />;
};

// Admin Route - Only accessible by admins
const AdminRoute = () => {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  
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
          Verifying permissions...
        </Typography>
      </Box>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to dashboard if not admin
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  
  // Render the outlet (child routes)
  return <Outlet />;
};

const App = () => {
  const [mode, setMode] = useState('light');
  
  // Effect to check and set theme preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);
  
  // Create theme
  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#90caf9' : '#1976d2',
      },
      secondary: {
        main: mode === 'dark' ? '#f48fb1' : '#dc004e',
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#f5f5f5',
        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
  });
  
  // Toggle theme
  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <DataProvider>
          <BrowserRouter basename="/KIOSC-Finance-Supabass">
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={
                <AuthLayout>
                  <Login />
                </AuthLayout>
              } />
              
              {/* New Auth Routes */}
              <Route path="/signup" element={
                <AuthLayout>
                  <Signup />
                </AuthLayout>
              } />
              
              <Route path="/forgot-password" element={
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              } />
              
              <Route path="/reset-password" element={
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              } />
              
              {/* Setup Routes */}
              <Route path="/setup" element={
                <AuthLayout>
                  <SupabaseSetup />
                </AuthLayout>
              } />
              
              <Route path="/debug" element={
                <AuthLayout>
                  <SupabaseDebug />
                </AuthLayout>
              } />
              
              {/* Test & Diagnostic Routes */}
              <Route path="/test" element={
                <AuthLayout>
                  <ConnectionTest />
                </AuthLayout>
              } />
              
              <Route path="/api-test" element={
                <AuthLayout>
                  <ApiKeyTest />
                </AuthLayout>
              } />
              
              <Route path="/project-status" element={
                <AuthLayout>
                  <ProjectStatusCheck />
                </AuthLayout>
              } />
              
              <Route path="/db-setup" element={
                <AuthLayout>
                  <DatabaseSetup />
                </AuthLayout>
              } />
              
              
              {/* Protected Routes - Using the new pattern with Outlet */}
              <Route element={<PrivateRoute />}>
                <Route path="/" element={
                  <MainLayout toggleTheme={toggleTheme}>
                    <Dashboard />
                  </MainLayout>
                } />
                
                <Route path="/expenses" element={
                  <MainLayout toggleTheme={toggleTheme}>
                    <ExpenseManagement />
                  </MainLayout>
                } />
                
                <Route path="/suppliers" element={
                  <MainLayout toggleTheme={toggleTheme}>
                    <SupplierManagement />
                  </MainLayout>
                } />
                
                <Route path="/journal" element={
                  <MainLayout toggleTheme={toggleTheme}>
                    <JournalEntry />
                  </MainLayout>
                } />
              </Route>
              
              {/* Admin-Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/users" element={
                  <MainLayout toggleTheme={toggleTheme}>
                    <UserManagement />
                  </MainLayout>
                } />
                
                <Route path="/settings" element={
                  <MainLayout toggleTheme={toggleTheme}>
                    <Settings />
                  </MainLayout>
                } />
              </Route>
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;