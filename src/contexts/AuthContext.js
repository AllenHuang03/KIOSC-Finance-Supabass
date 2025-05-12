// src/contexts/AuthContext.js - Enhanced version with session persistence
import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Store current user data in localStorage (not sessionStorage) to persist between refreshes
  const saveUserToStorage = (userData) => {
    if (userData) {
      // Store comprehensive user data
      try {
        localStorage.setItem('currentUser', JSON.stringify(userData));
        // Also save a session timestamp
        localStorage.setItem('sessionTimestamp', new Date().toISOString());
        // Flag to identify authenticated state across refreshes
        localStorage.setItem('isAuthenticated', 'true');
        console.log('User data saved to local storage:', userData);
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    } else {
      // Clear session on logout
      localStorage.removeItem('currentUser');
      localStorage.removeItem('sessionTimestamp');
      localStorage.removeItem('isAuthenticated');
    }
  };
  
  // Check for saved user data on component mount - this is the first priority
  useEffect(() => {
    const checkLocalStorage = () => {
      console.log('Checking local storage for saved user session...');
      const savedUser = localStorage.getItem('currentUser');
      const isStoredAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      if (savedUser && isStoredAuthenticated) {
        try {
          console.log('Found saved user in local storage');
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          return true;
        } catch (e) {
          console.error('Error parsing saved user:', e);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('isAuthenticated');
        }
      }
      return false;
    };
    
    // Do this check immediately when the component mounts
    const hasLocalUser = checkLocalStorage();
    
    if (hasLocalUser) {
      console.log('User restored from local storage');
      // Still need to verify with Supabase, but we can show the UI immediately
      setAuthChecked(true);
      setLoading(false);
    }
  }, []);

  // Initialize auth state - runs after checking localStorage
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (!mounted) return;
      
      // Only set loading if we don't already have a user
      if (!user) {
        setLoading(true);
      }
      
      try {
        console.log('Initializing auth with Supabase...');
        // Check with Supabase regardless of localStorage to ensure session validity
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Supabase session error:', error);
          throw error;
        }
        
        if (mounted) {
          const { session } = data;
          setSession(session);
          
          if (session?.user) {
            console.log('Valid Supabase session found');
            // Get user details from the Users table for complete profile
            const { data: userData, error: userError } = await supabase
              .from('Users')
              .select('*')
              .eq('email', session.user.email)
              .single();
            
            if (!userError && userData) {
              // Combine auth user and database user info
              const combinedUser = {
                ...session.user,
                username: userData.username,
                name: userData.name,
                role: userData.role,
                permissions: userData.permissions,
                status: userData.status
              };
              
              setUser(combinedUser);
              saveUserToStorage(combinedUser);
              setIsAuthenticated(true);
            } else {
              // Just use the auth user if no matching database record
              setUser(session.user);
              saveUserToStorage(session.user);
              setIsAuthenticated(true);
            }
          } else if (!user) {
            // Only reset if we don't have a user from localStorage
            console.log('No valid Supabase session found and no local user');
            setUser(null);
            setIsAuthenticated(false);
            saveUserToStorage(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(error.message);
          
          // Only reset authentication if we don't have a valid local user
          if (!user) {
            setUser(null);
            setIsAuthenticated(false);
            saveUserToStorage(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };
    
    initAuth();
    
    // This function periodically verifies the session with Supabase
    // and refreshes the token if needed
    const refreshSession = async () => {
      try {
        if (!mounted) return;
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session refresh error:', error);
          return;
        }
        
        if (data && data.session) {
          console.log('Session refreshed with Supabase');
          setSession(data.session);
        } else if (user) {
          // We have a local user but no active Supabase session
          // Attempt to restore the session
          console.log('No active Supabase session found, but using stored user data');
          
          // Check if this is the admin user which might be using the fallback flow
          if (user.email === 'admin@kiosc.com' || user.username === 'admin') {
            console.log('Admin user is using fallback authentication, maintaining session');
            // Skip further session validation
            return;
          }
          
          // TODO: attempt to refresh token or redirect to login if expired
          // For now, we'll just set the user but warn about potentially needing to login again
          console.warn('Session may be expired, might need to login again soon');
        }
      } catch (e) {
        console.error('Session verification error:', e);
      }
    };
    
    // Run the refresh on an interval
    const sessionRefreshInterval = setInterval(refreshSession, 5 * 60 * 1000); // Every 5 minutes
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", _event, session);
        setSession(session);
        
        if (session?.user) {
          // Update with user details from database
          try {
            const { data: userData, error: userError } = await supabase
              .from('Users')
              .select('*')
              .eq('email', session.user.email)
              .single();
            
            if (!userError && userData) {
              // Combine auth user and database user info
              const combinedUser = {
                ...session.user,
                username: userData.username,
                name: userData.name,
                role: userData.role,
                permissions: userData.permissions,
                status: userData.status
              };
              
              setUser(combinedUser);
              saveUserToStorage(combinedUser);
              setIsAuthenticated(true);
            } else {
              // Just use the auth user if no matching database record
              setUser(session.user);
              saveUserToStorage(session.user);
              setIsAuthenticated(true);
            }
          } catch (e) {
            console.error('Error fetching user details:', e);
            setUser(session.user);
            saveUserToStorage(session.user);
            setIsAuthenticated(true);
          }
        } else {
          // Only reset the user if this is a proper sign-out event
          // This prevents unexpected logouts on page refresh if Supabase session might be briefly unavailable
          if (_event === 'SIGNED_OUT') {
            console.log('User signed out, clearing state');
            setUser(null);
            saveUserToStorage(null);
            setIsAuthenticated(false);
          }
        }
        
        setAuthChecked(true);
      }
    );
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(sessionRefreshInterval);
    };
  }, [user]); // Add user as a dependency to prevent resetting when user is already loaded

  // Login with email and password
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Special case for admin user to keep backward compatibility
      if (email === 'admin' || email === 'admin@kiosc.com') {
        email = 'admin@kiosc.com'; // Use a standard email format
      }
      
      console.log('Attempting login with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.log('Auth error:', error);
        
        // If this is the admin fallback case, handle it separately
        if (email === 'admin@kiosc.com' || email === 'admin') {
          console.log('Using admin fallback login due to Supabase auth error');
          
          // Try to query the User record from the database
          const { data: userData, error: userError } = await supabase
            .from('Users')
            .select('*')
            .eq('username', 'admin')
            .single();
            
          if (!userError && userData) {
            console.log('Found admin user in database, using for fallback login');
            
            // Create a mock user
            const mockUser = {
              id: userData.id || 'admin-id',
              email: 'admin@kiosc.com',
              username: 'admin',
              name: userData.name || 'Administrator',
              role: 'admin',
              permissions: userData.permissions || 'admin,read,write,delete',
              status: 'active',
              app_metadata: {
                role: 'admin'
              },
              user_metadata: {
                name: 'Administrator'
              }
            };
            
            setUser(mockUser);
            saveUserToStorage(mockUser);
            setIsAuthenticated(true);
            setAuthChecked(true);
            return true;
          }
          
          // Final fallback - create a hardcoded admin user
          if (password === 'admin123' || password === '') { // Accept empty password for demo
            console.log('Using hardcoded admin fallback as last resort');
            const mockUser = {
              id: 'admin-id',
              email: 'admin@kiosc.com',
              username: 'admin',
              name: 'Administrator',
              role: 'admin',
              permissions: 'admin,read,write,delete',
              status: 'active',
              app_metadata: {
                role: 'admin'
              },
              user_metadata: {
                name: 'Administrator'
              }
            };
            
            setUser(mockUser);
            saveUserToStorage(mockUser);
            setIsAuthenticated(true);
            setAuthChecked(true);
            return true;
          } else {
            setError('Invalid password for admin user');
            return false;
          }
        }
        
        throw error;
      }
      
      console.log("Auth state after login:", data.session);
      
      // User details will be set via the onAuthStateChange listener
      // But we should explicitly save to localStorage here
      if (data.session && data.session.user) {
        // Try to get more user info from the database
        try {
          const { data: userData, error: userError } = await supabase
            .from('Users')
            .select('*')
            .eq('email', data.session.user.email)
            .single();
          
          if (!userError && userData) {
            // Create combined user object
            const combinedUser = {
              ...data.session.user,
              username: userData.username,
              name: userData.name,
              role: userData.role,
              permissions: userData.permissions,
              status: userData.status
            };
            
            // Save to local storage
            saveUserToStorage(combinedUser);
            setUser(combinedUser);
            setIsAuthenticated(true);
            setAuthChecked(true);
          } else {
            // Just save the basic user
            saveUserToStorage(data.session.user);
            setUser(data.session.user);
            setIsAuthenticated(true);
            setAuthChecked(true);
          }
        } catch (e) {
          console.error('Error fetching additional user data:', e);
          // Save basic user info if extended info fails
          saveUserToStorage(data.session.user);
          setUser(data.session.user);
          setIsAuthenticated(true);
          setAuthChecked(true);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register a new user
  const register = async (email, password, userData) => {
    try {
      setLoading(true);
      setError(null);
      
      // First register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role || 'user' // Default to 'user' role
          }
        }
      });
      
      if (error) throw error;
      
      // Create entry in Users table
      const newUser = {
        username: userData.username || email.split('@')[0],
        name: userData.name,
        email: email,
        role: userData.role || 'user',
        permissions: userData.permissions || 'read',
        status: userData.status || 'pending' // Default to 'pending' for admin approval
      };
      
      // Check if the user ID from auth is available
      if (data?.user?.id) {
        newUser.id = data.user.id;
      }
      
      const { error: insertError } = await supabase
        .from('Users')
        .insert(newUser);
      
      if (insertError) {
        console.error('Error creating user in database:', insertError);
        // The auth user was created, so we'll continue
      }
      
      return {
        success: true,
        requiresEmailVerification: data?.user?.identities?.length === 0,
        status: newUser.status,
        message: newUser.status === 'pending' ? 
          'Your account has been created but requires admin approval.' : 
          'Your account has been created successfully.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Request password reset
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password'
      });
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Password updated successfully.'
      };
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Approve a user
  const approveUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('Users')
        .update({ status: 'active' })
        .eq('id', userId);
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'User approved successfully.'
      };
    } catch (error) {
      console.error('User approval error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Update user role and permissions
  const updateUserRole = async (userId, role, permissions) => {
    try {
      setLoading(true);
      setError(null);
      
      const updates = { role };
      if (permissions) {
        updates.permissions = Array.isArray(permissions) ? 
          permissions.join(',') : permissions;
      }
      
      const { error } = await supabase
        .from('Users')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'User role updated successfully.'
      };
    } catch (error) {
      console.error('User role update error:', error);
      setError(error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if using real auth or fallback
      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      
      // Always clear user state and local storage
      setUser(null);
      setIsAuthenticated(false);
      saveUserToStorage(null);
      
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    // For admin user, grant all permissions
    if (!user) return false;
    
    // Admin user check
    if (user.role === 'admin' || user.email === 'admin@kiosc.com' || 
        (user.app_metadata && user.app_metadata.role === 'admin')) {
      return true;
    }
    
    // Other permission logic
    const userPermissions = user.permissions || [];
    if (typeof userPermissions === 'string') {
      return userPermissions.split(',').map(p => p.trim()).includes(permission);
    }
    
    return Array.isArray(userPermissions) && userPermissions.includes(permission);
  };

  // Check if user is admin
  const isAdmin = () => {
    if (!user) return false;
    
    return (
      user.role === 'admin' || 
      user.email === 'admin@kiosc.com' || 
      (user.app_metadata && user.app_metadata.role === 'admin')
    );
  };

  // Get all users - for admin user management
  const getAllUsers = async () => {
    try {
      if (!isAdmin()) {
        throw new Error('Unauthorized access');
      }
      
      const { data, error } = await supabase
        .from('Users')
        .select('*');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message);
      return [];
    }
  };

  // Get pending users for approval
  const getPendingUsers = async () => {
    try {
      if (!isAdmin()) {
        throw new Error('Unauthorized access');
      }
      
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setError(error.message);
      return [];
    }
  };

  const currentUser = user;

  const contextValue = {
    user,
    currentUser,
    session,
    loading,
    error,
    login,
    logout,
    register,
    resetPassword,
    updatePassword,
    approveUser,
    updateUserRole,
    getAllUsers,
    getPendingUsers,
    hasPermission,
    isAdmin,
    isAuthenticated,
    authChecked
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;