// src/components/ConnectionTest.js
import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Alert, 
  Paper, 
  CircularProgress, 
  TextField,
  Divider,
  Grid,
  Card,
  CardContent,
  Link
} from '@mui/material';
import supabase from '../lib/supabase';

const ConnectionTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [adminCreated, setAdminCreated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@example.com'); // Changed from kiosc.com
  const [adminPassword, setAdminPassword] = useState('Admin123!'); // Stronger password
  const [supabaseDetails, setSupabaseDetails] = useState({
    url: '',
    key: ''
  });

  useEffect(() => {
    // Display current Supabase settings
    setSupabaseDetails({
      url: supabase.supabaseUrl,
      key: supabase.supabaseKey ? 
        supabase.supabaseKey.substring(0, 10) + '...' + 
        supabase.supabaseKey.substring(supabase.supabaseKey.length - 5) : 
        'Not available'
    });
    
    // Check current session on component mount
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error) {
          setSession(data.session);
        }
      } catch (err) {
        console.error('Error checking session:', err);
      }
    };
    
    checkSession();
  }, []);

  const runConnectionTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test basic Supabase URL connection (no auth required)
      const response = await fetch(`${supabase.supabaseUrl}/rest/v1/`);
      
      const result = {
        success: response.ok || response.status === 404, // 404 is actually OK - it means the endpoint exists
        urlConnection: response.ok || response.status === 404,
        status: response.status,
        timestamp: new Date().toISOString(),
        message: response.ok || response.status === 404 ? 
          'Connection to Supabase URL successful!' : 
          `Connection failed with status: ${response.status}`
      };
      
      console.log('Basic URL connection test result:', result);
      setTestResults(result);
      
      if (!result.success) {
        setError(`Connection test failed with status: ${response.status}`);
        return;
      }
      
      // Now test auth endpoint
      try {
        const { data, error } = await supabase.auth.getSession();
        
        setTestResults({
          ...result,
          authEndpoint: !error,
          authMessage: error ? `Auth endpoint error: ${error.message}` : 'Auth endpoint accessible',
          message: !error ? 
            'Connection to Supabase and auth endpoint successful!' : 
            `Connection to Supabase URL successful, but auth endpoint returned error: ${error.message}`
        });
        
        if (error) {
          console.warn('Auth endpoint test error:', error);
        }
      } catch (authErr) {
        console.error('Auth endpoint test exception:', authErr);
        setTestResults({
          ...result,
          authEndpoint: false,
          authMessage: `Auth endpoint error: ${authErr.message}`,
          message: `Connection to Supabase URL successful, but auth endpoint check failed: ${authErr.message}`
        });
      }
    } catch (err) {
      console.error('Connection test error:', err);
      setError(err.message || 'An unknown error occurred during testing');
      setTestResults({
        success: false,
        error: err,
        timestamp: new Date().toISOString(),
        message: `Connection test failed: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testTableAccess = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to select from the Users table
      const { data, error } = await supabase
        .from('Users')
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.error('Table access error:', error);
        setTestResults({
          ...testResults,
          tableAccess: false,
          tableMessage: `Table access error: ${error.message}`,
          timestamp: new Date().toISOString()
        });
        
        // Check if this is a "table doesn't exist" error
        if (error.message.includes('does not exist')) {
          setError('The Users table does not exist yet. You need to set up your database schema.');
        } else if (error.code === 'PGRST301') {
          setError('Authentication required for table access. Please sign in first.');
        } else {
          setError(`Table access error: ${error.message}`);
        }
      } else {
        setTestResults({
          ...testResults,
          tableAccess: true,
          tableMessage: 'Successfully accessed Users table',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Table access test error:', err);
      setError(`Table access test error: ${err.message}`);
      setTestResults({
        ...testResults,
        tableAccess: false,
        tableMessage: `Table access error: ${err.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate email format before submitting
      if (!validateEmail(adminEmail)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }
      
      // Validate password strength
      if (adminPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }
      
      console.log('Creating admin user with email:', adminEmail);
      
      // Create an admin user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            role: 'admin'
          }
        }
      });
      
      if (error) {
        console.error('Auth signup error:', error);
        setError(`Admin creation failed: ${error.message}`);
        return;
      }
      
      console.log('Admin user created successfully:', data);
      setAdminCreated(true);
      setTestResults({
        ...testResults,
        adminAuthCreated: true,
        timestamp: new Date().toISOString()
      });
      
      // Try to sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      
      if (signInError) {
        console.error('Sign in error after creation:', signInError);
        setError(`User created but sign-in failed: ${signInError.message}`);
      } else {
        // Refresh session state
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        
        setTestResults({
          ...testResults,
          adminAuthCreated: true,
          adminSignedIn: true,
          timestamp: new Date().toISOString()
        });
        
        // Now try to create the user in the Users table
        try {
          // Only create in Users table if user is signed in
          if (sessionData.session) {
            const adminUser = {
              id: sessionData.session.user.id,
              username: adminEmail.split('@')[0],
              name: 'Administrator',
              email: adminEmail,
              role: 'admin',
              permissions: 'admin,read,write',
              status: 'active'
            };
            
            const { error: userError } = await supabase
              .from('Users')
              .upsert([adminUser]);
            
            if (userError) {
              console.error('Error creating admin in Users table:', userError);
              if (userError.message.includes('does not exist')) {
                setError('Admin user created and signed in, but Users table does not exist yet. You need to set up your database schema.');
              } else {
                setError(`Admin user created and signed in, but Users table insert failed: ${userError.message}`);
              }
            } else {
              setTestResults({
                ...testResults,
                adminAuthCreated: true,
                adminSignedIn: true,
                adminTableCreated: true,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.error('Error upserting admin to Users table:', e);
          setError(`Admin user created and signed in, but Users table insert failed with exception: ${e.message}`);
        }
      }
    } catch (err) {
      console.error('Admin creation error:', err);
      setError(`Admin creation failed with exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate email format before submitting
      if (!validateEmail(adminEmail)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      
      if (error) {
        console.error('Sign in error:', error);
        setError(`Sign in failed: ${error.message}`);
        return;
      }
      
      // Refresh session state
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      
      setTestResults({
        ...testResults,
        adminSignedIn: true,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Sign in error:', err);
      setError(`Sign in failed with exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setError(null);
    } catch (err) {
      setError(`Sign out error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Email validation helper
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Supabase Connection Diagnostics
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        This tool helps verify your Supabase connection and setup.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Configuration
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Supabase URL:</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {supabaseDetails.url}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">API Key (truncated):</Typography>
                <Typography color="text.secondary" variant="body2">
                  {supabaseDetails.key}
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Authentication Status:</Typography>
                <Typography color={session ? 'success.main' : 'error.main'} variant="body2">
                  {session ? 'Authenticated' : 'Not Authenticated'} 
                </Typography>
                {session && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      User: {session.user.email}
                    </Typography>
                    <Button variant="outlined" size="small" onClick={signOut} sx={{ mt: 1 }}>
                      Sign Out
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Connection Testing
            </Typography>
            <Button
              variant="contained"
              onClick={runConnectionTest}
              disabled={loading}
              fullWidth
              sx={{ mb: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Testing Connection...
                </>
              ) : (
                'Test Basic Connection'
              )}
            </Button>
            
            <Button
              variant="outlined"
              onClick={testTableAccess}
              disabled={loading}
              fullWidth
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Testing Tables...
                </>
              ) : (
                'Test Table Access'
              )}
            </Button>
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Authentication
            </Typography>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Email Address"
                variant="outlined"
                size="small"
                fullWidth
                margin="dense"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                helperText="Use a valid email format (e.g., user@example.com)"
              />
              
              <TextField
                label="Password"
                variant="outlined"
                size="small"
                fullWidth
                margin="dense"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                helperText="Minimum 6 characters"
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={createAdminUser}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
              
              <Button
                variant="outlined"
                onClick={signIn}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      {Object.keys(testResults).length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          {testResults.message && (
            <Alert 
              severity={testResults.success ? "success" : "error"} 
              sx={{ mb: 2 }}
            >
              {testResults.message}
            </Alert>
          )}
          
          <Box component="ul" sx={{ pl: 2 }}>
            {Object.entries(testResults).map(([key, value]) => {
              if (key === 'timestamp' || key === 'message' || key === 'error') return null;
              
              // Format the key for display
              const displayKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());
              
              // Format the value
              let displayValue;
              if (typeof value === 'boolean') {
                displayValue = value ? '✅ Success' : '❌ Failed';
              } else if (value === 'exists') {
                displayValue = '⚠️ Already Exists';
              } else {
                displayValue = String(value);
              }
              
              return (
                <Box component="li" key={key}>
                  <strong>{displayKey}:</strong> {displayValue}
                </Box>
              );
            })}
            
            {testResults.error && (
              <Box component="li" sx={{ color: 'error.main' }}>
                <strong>Error details:</strong> {testResults.error.message || JSON.stringify(testResults.error)}
              </Box>
            )}
            
            <Box component="li" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              Test run at: {new Date(testResults.timestamp).toLocaleString()}
            </Box>
          </Box>
        </Box>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Troubleshooting Tips
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          If you're experiencing issues with Supabase, check:
        </Typography>
        
        <Box component="ul" sx={{ pl: 3, mt: 1 }}>
          <li>
            <Typography variant="body2" color="text.secondary">
              <strong>Email restrictions:</strong> Some Supabase projects may have email domain restrictions
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              <strong>Password requirements:</strong> Ensure passwords meet minimum requirements (usually 6+ characters)
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              <strong>RLS policies:</strong> Ensure your database has proper Row Level Security (RLS) policies
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              <strong>Tables:</strong> Make sure your tables exist with the correct structure
            </Typography>
          </li>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <Link href="/setup" underline="hover">
              Go to Database Setup
            </Link>
            {' | '}
            <Link href="/login" underline="hover">
              Return to Login
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ConnectionTest;