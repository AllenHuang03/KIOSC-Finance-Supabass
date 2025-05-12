// src/components/ProjectStatusCheck.js
import React, { useState } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Alert, 
  Paper, 
  CircularProgress, 
  Divider,
  Link,
  Card,
  CardContent
} from '@mui/material';
import { verifyApiKey, checkProjectStatus } from '../lib/checkApiKey';

const ProjectStatusCheck = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [supabaseUrl] = useState(process.env.REACT_APP_SUPABASE_URL || 'https://irpocixuwvwycgmfudeq.supabase.co');
  
  const checkProject = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First check if the project is online
      const statusResult = await checkProjectStatus();
      
      setResults({
        projectStatus: statusResult,
        timestamp: new Date().toISOString()
      });
      
      if (!statusResult.online) {
        setError(`Project appears to be offline or inaccessible: ${statusResult.message}`);
        setLoading(false);
        return;
      }
      
      // Now verify the API key
      const keyResult = await verifyApiKey();
      
      setResults(prev => ({
        ...prev,
        apiKey: keyResult,
        timestamp: new Date().toISOString()
      }));
      
      if (!keyResult.valid) {
        setError(keyResult.message);
      }
    } catch (err) {
      console.error('Project check error:', err);
      setError(`Failed to check project status: ${err.message}`);
      setResults({
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Supabase Project Status Check
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        This tool will check if your Supabase project is online and verify your API key.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Project Information
            </Typography>
            <Typography variant="body2">
              <strong>URL:</strong> {supabaseUrl}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Project Status:</strong> {results.projectStatus?.online ? 
                '✅ Online' : 
                results.projectStatus ? '❌ Offline' : 'Not checked yet'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>API Key Status:</strong> {results.apiKey?.valid ? 
                '✅ Valid' : 
                results.apiKey ? '❌ Invalid' : 'Not checked yet'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      
      <Button
        variant="contained"
        onClick={checkProject}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        {loading ? (
          <>
            <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
            Checking Project...
          </>
        ) : (
          'Check Project Status'
        )}
      </Button>
      
      {Object.keys(results).length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          {results.projectStatus && (
            <Alert 
              severity={results.projectStatus.online ? "success" : "error"} 
              sx={{ mb: 2 }}
            >
              Project Status: {results.projectStatus.message}
            </Alert>
          )}
          
          {results.apiKey && (
            <Alert 
              severity={results.apiKey.valid ? "success" : "error"} 
              sx={{ mb: 2 }}
            >
              API Key: {results.apiKey.message}
            </Alert>
          )}
          
          {results.timestamp && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Test run at: {new Date(results.timestamp).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Troubleshooting Recommendations
        </Typography>
        
        <Typography variant="body2" paragraph>
          If your project is offline or your API key is invalid, try these steps:
        </Typography>
        
        <ol>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Check your Supabase Dashboard:</strong> Log in to your Supabase account and ensure your project is active and not paused.
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Verify your API key:</strong> Go to Project Settings , API in your Supabase dashboard and check that you're using the correct anon/public key.
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Create a new project:</strong> If your project seems broken, consider creating a new Supabase project and updating your connection details.
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Check for payment issues:</strong> If your project is on a paid plan, ensure your billing is up to date.
            </Typography>
          </li>
        </ol>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <Link href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" underline="hover">
              Go to Supabase Dashboard
            </Link>
            {' | '}
            <Link href="/test" underline="hover">
              Back to Connection Test
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

export default ProjectStatusCheck;