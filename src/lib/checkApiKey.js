// src/lib/checkApiKey.js
import { createClient } from '@supabase/supabase-js';

// Direct API key verification function
export const verifyApiKey = async () => {
  try {
    // Get the details from environment or use hardcoded values
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://irpocixuwvwycgmfudeq.supabase.co';
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycG9jaXh1d3Z3eWNnbWZ1ZGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODk2MzMsImV4cCI6MjA2MjA2NTYzM30.5grREi4E-8SCciB2b27_v9stD1aBeSPMH1LTctr6ldI';
    
    console.log('Testing with:', { supabaseUrl });
    
    // Create minimal headers for verification
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };
    
    // Try a direct fetch to test the key - just checking HTTP status
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
      method: 'GET',
      headers
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      return {
        valid: false,
        message: 'API key rejected (401 Unauthorized). Your API key appears to be invalid or expired.'
      };
    } else if (response.ok || response.status === 404) {
      // 404 is acceptable - it means the endpoint exists but doesn't handle GET requests
      return {
        valid: true,
        message: 'API key appears to be valid! Connection successful.'
      };
    } else {
      return {
        valid: false,
        status: response.status,
        message: `Unexpected response (${response.status}). There might be an issue with your Supabase project configuration.`
      };
    }
  } catch (err) {
    console.error('API key verification error:', err);
    return {
      valid: false,
      error: err,
      message: `Connection error: ${err.message}`
    };
  }
};

// Check if project is active
export const checkProjectStatus = async () => {
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://irpocixuwvwycgmfudeq.supabase.co';
    
    // Try accessing the project without any auth - just to see if it's online
    const response = await fetch(`${supabaseUrl}/`);
    
    return {
      online: response.status !== 500 && response.status !== 502 && response.status !== 503 && response.status !== 504,
      status: response.status,
      message: response.ok ? 'Project is online!' : `Project returned status ${response.status}`
    };
  } catch (err) {
    return {
      online: false,
      error: err,
      message: `Cannot connect to project: ${err.message}`
    };
  }
};

export default { verifyApiKey, checkProjectStatus };