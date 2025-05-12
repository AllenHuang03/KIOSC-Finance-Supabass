// src/components/SupabaseDebug.js - Updated with better error handling
import React, { useEffect, useState } from 'react';
import { Alert, Box, Paper, Typography, Button, TextField, CircularProgress } from '@mui/material';
import { createClient } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

const SupabaseDebug = () => {
  const [status, setStatus] = useState('Checking...');
  const [error, setError] = useState(null);
  const [supabaseUrl, setSupabaseUrl] = useState('https://irpocixuwvwycgmfudeq.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Test direct connection with any available table
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setStatus('Testing connection...');
    
    try {
      // Create a test client with provided credentials
      const testClient = createClient(supabaseUrl, supabaseKey);
      
      // First try a simple test query - list available tables
      const { data: tables, error: tablesError } = await testClient.rpc('get_schema_info');
      
      if (tablesError) {
        console.log('Schema info not available, trying simple query');
        
        // Try a simple SELECT query that works even with empty databases
        const { error: pingError } = await testClient.from('pg_stat_activity').select('count(*)', { count: 'exact', head: true });
        
        if (pingError) {
          console.log('Simple query failed, trying fallback');
          
          // Final fallback - try to create a test table
          const { error: createError } = await testClient.from('supabase_test')
            .upsert({ id: 1, name: 'test' });
            
          if (createError && !createError.message.includes('does not exist')) {
            // If error is not about missing table, we have a connection
            setStatus('Connection established but no permission to create tables');
            return;
          } else {
            throw new Error('Could not connect to database');
          }
        }
      }
      
      // If we got here, connection works
      setStatus('Connected successfully!' + (tables ? ` Found ${tables.length} tables.` : ''));
      
      // Store successful connection details in localStorage
      localStorage.setItem('supabaseUrl', supabaseUrl);
      localStorage.setItem('supabaseKey', supabaseKey);
      
    } catch (err) {
      console.error('Connection test error:', err);
      setError(err.message || 'Unknown error');
      setStatus('Connection failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Load saved credentials on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');
    
    if (savedUrl) setSupabaseUrl(savedUrl);
    if (savedKey) setSupabaseKey(savedKey);
    
    // Don't auto-test to avoid unnecessary API calls
  }, []);
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Supabase Connection Debugger
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Supabase URL"
          value={supabaseUrl}
          onChange={(e) => setSupabaseUrl(e.target.value)}
          margin="normal"
        />
        
        <TextField
          fullWidth
          label="Supabase Anon Key"
          value={supabaseKey}
          onChange={(e) => setSupabaseKey(e.target.value)}
          margin="normal"
          type="password"
        />
        
        <Button 
          variant="contained" 
          onClick={testConnection}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} sx={{ mr: 1 }} /> : null}
          Test Connection
        </Button>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">
          Connection Status: {status}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error: {error}
          </Alert>
        )}
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        This tool helps debug connection issues with your Supabase backend.
        Use it to verify your credentials before running the setup process.
      </Typography>
    </Paper>
  );
};

export default SupabaseDebug;