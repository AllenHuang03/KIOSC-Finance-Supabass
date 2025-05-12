// src/pages/Login.js - Merged version with existing functionality
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Alert, 
  InputAdornment, 
  IconButton,
  CircularProgress,
  Paper,
  Divider,
  Container
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  LockOutlined as LockIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import supabaseService from '../services/SupabaseService';
import supabase from '../lib/supabase';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, error: authError, loading: authLoading } = useAuth();
  const { loading: dataLoading, initialized } = useData();
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [firstTimeSetup, setFirstTimeSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  
  // Check if this is first-time setup
  useEffect(() => {
    const checkFirstTimeSetup = async () => {
      try {
        setSetupLoading(true);
        
        // Try a simple query to see if database is accessible and has data
        const { data: userCount, error } = await supabase
          .from('Users')
          .select('*', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.error('Error querying database:', error);
          setFirstTimeSetup(true);
        } else if (!userCount || userCount.length === 0) {
          // No users found - need setup
          console.log('No users found in database, first time setup needed');
          setFirstTimeSetup(true);
        } else {
          console.log('Database has users, no setup needed');
          setFirstTimeSetup(false);
        }
      } catch (error) {
        console.error('Database connection error:', error);
        setFirstTimeSetup(true);
      } finally {
        setSetupLoading(false);
      }
    };
    
    checkFirstTimeSetup();
  }, []);
  
  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormError('');
    
    // Check if username and password are provided
    if (!username.trim()) {
      setFormError('Please enter a username');
      return;
    }
    
    if (!password.trim()) {
      setFormError('Please enter a password');
      return;
    }
    
    // Attempt login
    try {
      // Convert username to email format if needed
      const email = username.includes('@') ? username : `${username}@kiosc.com`;
      const success = await login(email, password);
      
      if (success) {
        // Test Supabase connection after login
        try {
          // Check auth state after login
          const { data } = await supabase.auth.getSession();
          console.log("Current session after login:", data.session);
          
          // Test a direct query to validate authentication
          const { data: testData, error: testError } = await supabase
            .from('Users')
            .select('*')
            .limit(1);
            
          console.log("Test query result:", testData, testError);
          
          if (testError) {
            console.warn("Test query after login failed:", testError);
          }
        } catch (testErr) {
          console.warn("Error testing connection after login:", testErr);
          // Don't block navigation due to test failure
        }
        
        // Navigate to dashboard on success
        navigate('/');
      }
    } catch (error) {
      console.error("Login error:", error);
      setFormError(error.message || 'Login failed');
    }
  };
  
  // Handle setup database
  const handleSetupDatabase = async () => {
    try {
      setSetupLoading(true);
      setFormError('');
      
      // Create default admin user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'admin@kiosc.com',
        password: 'admin123' // In production, use a secure password
      });
      
      if (authError) {
        // If user already exists in auth, that's okay
        console.log('Auth user creation result:', authError);
      } else {
        console.log('Auth user created successfully:', authData);
      }
      
      // Create tables and initial data
      const result = await supabaseService.setupDatabase();
      
      if (result.success) {
        setFirstTimeSetup(false);
        setFormError('');
        alert('Database setup completed successfully! You can now log in as admin.');
      } else {
        throw new Error(result.message || 'Database setup failed');
      }
    } catch (error) {
      console.error('Setup error:', error);
      setFormError(`Setup failed: ${error.message}`);
    } finally {
      setSetupLoading(false);
    }
  };
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  // Show loading state if checking setup status
  if (setupLoading) {
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
          Checking database connection...
        </Typography>
      </Box>
    );
  }
  
  // Show loading state if data is still loading
  if (dataLoading || !initialized) {
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
          Initializing system...
        </Typography>
      </Box>
    );
  }
  
  // Show database setup option for first-time
  if (firstTimeSetup) {
    return (
      <Paper elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box 
            sx={{ 
              display: 'inline-flex', 
              p: 2, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'primary.contrastText', 
              mb: 2 
            }}
          >
            <SettingsIcon fontSize="large" />
          </Box>
          <Typography variant="h5" gutterBottom>
            Welcome to KIOSC Finance
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            It looks like this is your first time using the application. The database needs to be set up before you can proceed.
          </Typography>
          
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            onClick={handleSetupDatabase}
            disabled={setupLoading}
            sx={{ mt: 2 }}
          >
            {setupLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                Setting Up Database...
              </>
            ) : (
              'Set Up Database'
            )}
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            This will create the necessary tables and initial admin user in your Supabase database.
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box 
            sx={{ 
              display: 'inline-flex', 
              p: 2, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'primary.contrastText', 
              mb: 2 
            }}
          >
            <LockIcon fontSize="large" />
          </Box>
          <Typography variant="h4" gutterBottom>
            KIOSC Finance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to access your account
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {/* Error messages */}
          {(formError || authError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError || authError}
            </Alert>
          )}
          
          {/* Username field */}
          <TextField
            fullWidth
            label="Username or Email"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
          
          {/* Password field */}
          <TextField
            fullWidth
            label="Password"
            variant="outlined"
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          {/* Forgot Password Link */}
          <Box sx={{ textAlign: 'right', mt: 1, mb: 2 }}>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" color="primary">
                Forgot password?
              </Typography>
            </Link>
          </Box>
          
          {/* Submit button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2, mb: 2 }}
            disabled={authLoading}
          >
            {authLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
        
        <Divider sx={{ my: 3 }} />
        
        <Box textAlign="center">
          <Typography variant="body2">
            Don't have an account?{' '}
            <Link to="/signup" style={{ textDecoration: 'none' }}>
              Sign Up
            </Link>
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          Demo credentials: username - admin, password - admin123
        </Typography>
        
        <Box textAlign="center" mt={2}>
          <Link 
            component="button"
            variant="body2"
            onClick={() => setFirstTimeSetup(true)}
            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
          >
            Reset Database
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;