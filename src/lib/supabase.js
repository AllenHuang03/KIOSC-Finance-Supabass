// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Get environment variables (hardcoded for testing if not available)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://irpocixuwvwycgmfudeq.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycG9jaXh1d3Z3eWNnbWZ1ZGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODk2MzMsImV4cCI6MjA2MjA2NTYzM30.5grREi4E-8SCciB2b27_v9stD1aBeSPMH1LTctr6ldI';

// Debug output - check if variables are loaded
console.log('Supabase URL:', supabaseUrl);
console.log('API Key available:', !!supabaseKey);

// Options with explicit headers for API key
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
};

// Create the client with explicit options
const supabase = createClient(supabaseUrl, supabaseKey, options);

// Export a helper function to add API key to fetch requests
export const fetchWithApiKey = async (url, options = {}) => {
  const headers = {
    ...options.headers,
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };

  return fetch(url, {
    ...options,
    headers
  });
};

// Export the API key value for debugging
export const getApiKey = () => supabaseKey;

export default supabase;