// src/components/ApiKeyTest.js
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
  Card,
  CardContent
} from '@mui/material';
import supabase, { getApiKey, fetchWithApiKey } from '../lib/supabase';

const ApiKeyTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  
  useEffect(() => {
    // Get the current API key for display
    const currentKey = getApiKey();
    if (currentKey) {
      // Only show part of the key for security
      setApiKey(
        currentKey.substring(0, 10) + '...' + 
        currentKey.substring(currentKey.length - 5)
      );
    } else {
      setApiKey('No API key found');
    }
  }, []);
  
  const testApiKey = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test direct fetch with API key in headers
      const directUrl = `${supabase.supabaseUrl}/rest/v1/?apikey=${getApiKey()}`;
      
      console.log('Testing direct fetch with API key...');
      console.log('URL:', directUrl);
      
      const directResponse = await fetchWithApiKey(directUrl);
      
      // Store the direct fetch result
      const directResult = {
        status: directResponse.status,
        ok: directResponse.ok || directResponse.status === 404, // 404 is acceptable
        headers: {
          sent: {
            apikey: 'Present' // Don't log the actual key
          }
        }
      };
      
      // Now test using the Supabase client
      console.log('Testing Supabase client API...');
      
      let clientResult = {};
      try {
        const { data, error } = await supabase.auth.getSession();
        
        clientResult = {
          success: !error,
          error: error ? error.message : null,
          data: data ? 'Session data received' : 'No session data'
        };
      } catch (clientError) {
        clientResult = {
          success: false,
          error: clientError.message,
          exception: true
        };
      }
      
      // Store all results
      setResults({
        directFetch: directResult,
        clientApi: clientResult,
        timestamp: new Date().toISOString()
      });
      
      // Check for errors
      if (!directResult.ok) {
        setError(`Direct API test failed with status: ${directResult.status}`);
      } else if (!clientResult.success) {
        setError(`Supabase client test failed: ${clientResult.error}`);
      }
    } catch (err) {
      console.error('API key test error:', err);
      setError(`Test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const updateApiKey = () => {
    if (!customApiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }
    
    try {
      // Store in local storage
      localStorage.setItem('supabase_api_key', customApiKey.trim());
      
      // Alert to refresh
      alert('API key saved. Please refresh the page for it to take effect.');
    } catch (err) {
      setError(`Could not save API key: ${err.message}`);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        API Key Diagnostic
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        This tool helps diagnose issues with your Supabase API key configuration.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current API Key Configuration
          </Typography>
          <Typography variant="body2">
            <strong>Current API Key (truncated):</strong> {apiKey}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Environment Variable:</strong> {process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Available' : 'Not found'}
          </Typography>
        </CardContent>
      </Card>
      
      <Button
        variant="contained"
        onClick={testApiKey}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? (
          <>
            <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
            Testing API Key...
          </>
        ) : (
          'Test API Key Configuration'
        )}
      </Button>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Update API Key Manually
        </Typography>
        <TextField 
          label="Enter Supabase API Key"
          variant="outlined"
          fullWidth
          value={customApiKey}
          onChange={(e) => setCustomApiKey(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          sx={{ mb: 2 }}
        />
        <Button 
          variant="outlined" 
          onClick={updateApiKey}
          disabled={!customApiKey.trim()}
        >
          Save API Key
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          This will store the API key in browser local storage for testing purposes.
        </Typography>
      </Box>
      
      {Object.keys(results).length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            Direct API Request:
          </Typography>
          <Box sx={{ mb: 2, pl: 2 }}>
            <Typography variant="body2">
              Status: {results.directFetch?.status} ({results.directFetch?.ok ? 'Success' : 'Failed'})
            </Typography>
            <Typography variant="body2">
              API Key Header: {results.directFetch?.headers?.sent?.apikey || 'Not sent'}
            </Typography>
          </Box>
          
          <Typography variant="subtitle2" gutterBottom>
            Supabase Client Test:
          </Typography>
          <Box sx={{ mb: 2, pl: 2 }}>
            <Typography variant="body2" color={results.clientApi?.success ? 'success.main' : 'error.main'}>
              Result: {results.clientApi?.success ? 'Success' : 'Failed'}
            </Typography>
            {results.clientApi?.error && (
              <Typography variant="body2" color="error.main">
                Error: {results.clientApi.error}
              </Typography>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Test run at: {new Date(results.timestamp).toLocaleString()}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Common API Key Issues & Solutions
        </Typography>
        
        <ol>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Missing API Key:</strong> Ensure your .env.local file contains REACT_APP_SUPABASE_ANON_KEY
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Wrong Key Format:</strong> Make sure you're using the anon/public key, not the service_role key
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Expired Key:</strong> Go to Supabase Dashboard , Project Settings , API and regenerate the key
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Environment Variables Not Loading:</strong> Restart your development server after updating .env files
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Key Not Being Sent:</strong> Verify the API key is included in all request headers
            </Typography>
          </li>
        </ol>
      </Box>
    </Paper>
  );
};

export default ApiKeyTest;