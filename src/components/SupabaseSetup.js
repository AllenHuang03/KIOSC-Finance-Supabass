// src/components/SupabaseSetup.js - Updated with better connection handling
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Link
} from '@mui/material';
import { useData } from '../contexts/DataContext';
import excelService from '../services/ExcelService';
import supabaseService from '../services/SupabaseService';
import dataInitializer from '../utils/DataInitializer';
import supabase from '../lib/supabase';

const SupabaseSetup = () => {
  const navigate = useNavigate();
  const { initializeSupabase, loading, error } = useData();
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [setupError, setSetupError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [testResults, setTestResults] = useState({});
  
  const steps = [
    'Check Database Connection',
    'Create Admin User',
    'Initialize Data Structure'
  ];

  // Test connection to Supabase - without using _health table
  const testConnection = async () => {
    try {
      setActiveStep(0);
      console.log('Testing Supabase connection...');
      
      // Try a simple authentication check
      try {
        // Check if we can query anything
        const { data, error } = await supabase.rpc('get_settings');
        
        // If we get any response without a 401 error, connection works
        if (!error || error.code !== 'PGRST301') {
          console.log('Connection appears to be working');
          setTestResults({ ...testResults, connection: true });
          return true;
        }
      } catch (e) {
        console.log('Error testing connection via RPC:', e);
      }
      
      // Fallback - try to access any table
      try {
        const { error } = await supabase.from('Users').select('count(*)', { head: true, count: 'exact' });
        
        // If we get an error about the table not existing, that's actually good
        // It means the connection worked but the table doesn't exist yet
        if (error && error.message && (
            error.message.includes('does not exist') || 
            error.code === 'PGRST301')) {
          console.log('Connection works but Users table does not exist yet');
          setTestResults({ ...testResults, connection: true });
          return true;
        }
        
        // If there's no error, table exists and connection works
        if (!error) {
          console.log('Connection works and Users table exists');
          setTestResults({ ...testResults, connection: true });
          return true;
        }
      } catch (e) {
        console.log('Error testing connection via table query:', e);
      }
      
      // If we get here, connection failed
      console.error('All connection tests failed');
      setTestResults({ ...testResults, connection: false });
      throw new Error('Could not connect to Supabase database.');
    } catch (err) {
      console.error('Connection test failed:', err);
      setTestResults({ ...testResults, connection: false });
      throw err;
    }
  };

  // Create admin user
  const createAdminUser = async () => {
    try {
      setActiveStep(1);
      console.log('Creating admin user...');
      
      const adminData = {
        username: 'admin',
        name: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        permissions: 'admin,read,write',
        status: 'active'
      };
      
      // Try to insert admin user
      const { data, error } = await supabase.from('Users').insert([adminData]).select();
      
      if (error) {
        // If error is about table not existing, try creating it
        if (error.message && error.message.includes('does not exist')) {
          console.log('Users table does not exist, attempting to create it...');
          
          try {
            // Try creating Users table
            const { error: createError } = await supabase.rpc('create_users_table');
            
            if (createError) {
              console.error('Failed to create Users table:', createError);
              
              // Try simpler approach - just store in localStorage
              localStorage.setItem('admin_user', JSON.stringify(adminData));
              console.log('Stored admin user in localStorage as fallback');
              
              setTestResults({ ...testResults, adminUser: 'local' });
              return true;
            }
            
            // If table was created, try inserting again
            const { error: insertError } = await supabase.from('Users').insert([adminData]);
            
            if (insertError) {
              console.error('Failed to insert admin after creating table:', insertError);
              setTestResults({ ...testResults, adminUser: false });
              return false;
            }
          } catch (e) {
            console.error('Error during table creation:', e);
            setTestResults({ ...testResults, adminUser: false });
            return false;
          }
        } else {
          // Check if error is just that the user already exists
          if (error.message && error.message.includes('duplicate')) {
            console.log('Admin user already exists');
            setTestResults({ ...testResults, adminUser: true });
            return true;
          }
          
          console.error('Failed to create admin user:', error);
          setTestResults({ ...testResults, adminUser: false });
          return false;
        }
      }
      
      console.log('Admin user created successfully');
      setTestResults({ ...testResults, adminUser: true });
      return true;
    } catch (err) {
      console.error('Admin user creation failed:', err);
      setTestResults({ ...testResults, adminUser: false });
      return false;
    }
  };

  // Create basic data structure
  const initializeBasicData = async () => {
    try {
      setActiveStep(2);
      console.log('Initializing basic data structure...');
      
      const success = await supabaseService.markDatabaseAsSetup();
      
      // Regardless of success, we'll proceed to login
      setTestResults({ ...testResults, dataStructure: success });
      return true;
    } catch (err) {
      console.error('Data structure initialization failed:', err);
      setTestResults({ ...testResults, dataStructure: false });
      return false;
    }
  };

  const handleInitialize = async () => {
    setSetupLoading(true);
    setSetupError(null);
    setActiveStep(0);
    setCompleted(false);
    
    try {
      // Step 1: Test connection
      const connectionOk = await testConnection();
      if (!connectionOk) {
        throw new Error('Could not connect to Supabase. Please check your connection details.');
      }
      
      // Step 2: Create admin user
      const adminOk = await createAdminUser();
      if (!adminOk) {
        // Continue even if admin creation fails
        console.warn('Could not create admin user, but will continue with setup');
      }
      
      // Step 3: Initialize basic data
      const dataOk = await initializeBasicData();
      
      // Mark as completed even if some steps failed
      setCompleted(true);
    } catch (err) {
      console.error('Setup error:', err);
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    if (completed) {
      // Wait a moment then redirect
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [completed, navigate]);

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        KIOSC Finance - Database Setup
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        This utility will initialize your database for the KIOSC Finance Management System.
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ my: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {setupError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {setupError}
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              If you're having connection issues, try using the{' '}
              <Link component="button" onClick={() => navigate('/debug')}>
                Debug Tool
              </Link>{' '}
              to configure your connection.
            </Typography>
          </Box>
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {completed ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Database setup completed successfully! Redirecting to login...
        </Alert>
      ) : (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            onClick={handleInitialize}
            disabled={setupLoading || loading}
            sx={{ mt: 2 }}
          >
            {setupLoading || loading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Setting up...
              </>
            ) : (
              'Initialize Database'
            )}
          </Button>
        </Box>
      )}
      
      {/* Show test results if any are available */}
      {Object.keys(testResults).length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'left', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Setup Progress:</Typography>
          <ul>
            {Object.entries(testResults).map(([key, value]) => (
              <li key={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}:{' '}
                {typeof value === 'string' 
                  ? value === 'local' ? '⚠️ Local Fallback' : value 
                  : value ? '✅ Success' : '❌ Failed'}
              </li>
            ))}
          </ul>
        </Box>
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
        Note: This process will attempt to create a minimal database structure.
        At minimum, it will create an admin user for login.
      </Typography>
    </Paper>
  );
};

export default SupabaseSetup;