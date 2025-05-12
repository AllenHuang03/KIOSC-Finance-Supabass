// src/pages/UserManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  ListItemIcon,
  ListItemText,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  SaveAlt as SaveIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Description as CsvIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon, 
  CheckCircle as ActiveIcon,
  Block as BlockIcon,
  SupervisorAccount as AdminIcon,
  AccountCircle as UserIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import dataValidator from '../utils/DataValidator';

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// User role colors
const roleColors = {
  'admin': 'error',
  'manager': 'warning',
  'user': 'primary',
  'viewer': 'default'
};

// Available permissions
const availablePermissions = [
  { id: 'read', name: 'Read', description: 'View data and reports' },
  { id: 'write', name: 'Write', description: 'Create and edit records' },
  { id: 'delete', name: 'Delete', description: 'Delete records' },
  { id: 'admin', name: 'Admin', description: 'System administration' },
  { id: 'approve', name: 'Approve', description: 'Approve journal entries and expenses' }
];

// Available roles with default permissions
const availableRoles = [
  { 
    id: 'admin', 
    name: 'Administrator', 
    description: 'Full system access',
    defaultPermissions: ['read', 'write', 'delete', 'admin', 'approve']
  },
  { 
    id: 'manager', 
    name: 'Manager', 
    description: 'Department or program manager',
    defaultPermissions: ['read', 'write', 'approve']
  },
  { 
    id: 'user', 
    name: 'Standard User', 
    description: 'Regular system user',
    defaultPermissions: ['read', 'write']
  },
  { 
    id: 'viewer', 
    name: 'Viewer', 
    description: 'Read-only access',
    defaultPermissions: ['read']
  }
];

const UserManagement = () => {
  const { data, loading, error, addEntity, updateEntity, deleteEntity, saveData } = useData();
  const { 
    currentUser, 
    isAdmin, 
    getAllUsers, 
    getPendingUsers, 
    approveUser, 
    resetPassword, 
    updateUserRole,
    register 
  } = useAuth();
  
  // State
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState(null); // 'add', 'edit', 'view', 'permissions'
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuUser, setMenuUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  
  // Form state
  const [userForm, setUserForm] = useState({
    id: '',
    username: '',
    name: '',
    email: '',
    role: 'user',
    permissions: ['read'],
    status: 'active',
    lastLogin: null,
    createdAt: new Date().toISOString()
  });
  
  // Password fields (not stored in main form)
  const [passwordFields, setPasswordFields] = useState({
    password: '',
    confirmPassword: '',
    showPassword: false
  });
  
  // Form validation
  const [validationErrors, setValidationErrors] = useState([]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Load data from context
  useEffect(() => {
    const loadUsers = async () => {
      // Load from Supabase Database and Auth
      try {
        // Load active users
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter(user => user.status !== 'pending'));
        
        // Load pending users
        const awaitingUsers = await getPendingUsers();
        setPendingUsers(awaitingUsers);
        
        // If there are pending users, switch to pending tab
        if (awaitingUsers.length > 0 && tabValue === 0) {
          setTabValue(1);
        }
      } catch (error) {
        console.error('Error loading users from auth system:', error);
        
        // Fallback to DataContext if auth fails
        if (data && data.Users) {
          // Ensure all users have a permissions array
          const usersWithPermissions = data.Users.map(user => ({
            ...user,
            permissions: Array.isArray(user.permissions) ? user.permissions : []
          }));
          setUsers(usersWithPermissions);
        }
      }
    };
    
    loadUsers();
  }, [data, getAllUsers, getPendingUsers, tabValue]);
  
  // Reset form when adding new user
  useEffect(() => {
    if (dialogMode === 'add') {
      setUserForm({
        id: uuidv4(),
        username: '',
        name: '',
        email: '',
        role: 'user',
        permissions: ['read', 'write'],
        status: 'active', // Ensure status is set for new users
        lastLogin: null,
        createdAt: new Date().toISOString()
      });
      
      setPasswordFields({
        password: '',
        confirmPassword: '',
        showPassword: false
      });
    }
  }, [dialogMode]);
  
  // Admin check
  useEffect(() => {
    if (!isAdmin()) {
      // Redirect to dashboard if not admin
      setSnackbar({
        open: true,
        message: 'Only administrators can access user management',
        severity: 'error'
      });
    }
  }, [isAdmin]);
  
  // Open dialog for adding a new user
  const handleAddUser = () => {
    setDialogMode('add');
    setSelectedUser(null);
    setDialogOpen(true);
  };
  
  // Open dialog to edit a user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({ 
      ...user,
      status: user.status || 'active' // Ensure status is always set
    });
    setDialogMode('edit');
    setDialogOpen(true);
  };
  
  // Open dialog to view user details
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setUserForm({ ...user });
    setDialogMode('view');
    setDialogOpen(true);
  };
  
  // Open dialog to manage permissions
  const handleManagePermissions = (user) => {
    setSelectedUser(user);
    setUserForm({ ...user });
    setDialogMode('permissions');
    setDialogOpen(true);
  };
  
  // Open menu for user actions
  const handleOpenMenu = (event, user) => {
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  };
  
  // Close menu
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuUser(null);
  };
  
  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogMode(null);
    setSelectedUser(null);
    setValidationErrors([]);
  };
  
  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
    
    // Set default permissions when role changes
    if (name === 'role') {
      const role = availableRoles.find(r => r.id === value);
      if (role) {
        setUserForm(prev => ({ ...prev, permissions: [...role.defaultPermissions] }));
      }
    }
    
    // Clear validation errors when field is updated
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };
  
  // Handle password field changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordFields(prev => ({ ...prev, [name]: value }));
    
    // Clear validation errors when field is updated
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };
  
  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setPasswordFields(prev => ({ ...prev, showPassword: !prev.showPassword }));
  };
  
  // Handle permission checkbox changes
  const handlePermissionChange = (permission) => {
    setUserForm(prev => {
      // Ensure permissions is an array
      const currentPermissions = Array.isArray(prev.permissions) ? prev.permissions : [];
      
      if (currentPermissions.includes(permission)) {
        // Remove the permission
        return { ...prev, permissions: currentPermissions.filter(p => p !== permission) };
      } else {
        // Add the permission
        return { ...prev, permissions: [...currentPermissions, permission] };
      }
    });
  };
  
  // Handle user status change
  const handleStatusChange = async (user, newStatus) => {
    // Cannot deactivate yourself
    if (user.id === currentUser.id && newStatus === 'inactive') {
      setSnackbar({
        open: true,
        message: 'You cannot deactivate your own account',
        severity: 'error'
      });
      return;
    }
    
    try {
      // Use Auth system if available
      const result = await updateUserRole(user.id, user.role, user.permissions, newStatus);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `User status updated to ${newStatus}`,
          severity: 'success'
        });
        
        // Refresh user list
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter(user => user.status !== 'pending'));
      } else {
        throw new Error(result.message || 'Status update failed');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      
      // Fallback to DataContext
      try {
        // Create updated user object
        const updatedUser = { 
          ...user, 
          status: newStatus,
          modifiedBy: currentUser?.username || 'anonymous',
          modifiedAt: new Date().toISOString()
        };
        
        // Save changes
        const success = updateEntity('Users', user.id, updatedUser);
        
        if (success) {
          setSnackbar({
            open: true,
            message: `User status updated to ${newStatus}`,
            severity: 'success'
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Error updating user status',
            severity: 'error'
          });
        }
      } catch (fallbackErr) {
        console.error('Status update fallback failed:', fallbackErr);
        setSnackbar({
          open: true,
          message: 'Error updating user status',
          severity: 'error'
        });
      }
    }
    
    // Close the menu
    handleCloseMenu();
  };
  
  // Handle user save (add/edit)
  const handleSaveUser = async () => {
    // Check if this is a new user requiring a password
    if (dialogMode === 'add') {
      // Validate password match
      if (passwordFields.password !== passwordFields.confirmPassword) {
        setValidationErrors(['Passwords do not match']);
        return;
      }
      
      // Validate password strength
      if (passwordFields.password.length < 6) {
        setValidationErrors(['Password must be at least 6 characters long']);
        return;
      }
    }
    
    // Validate the form data
    const formValidationFunction = dataValidator?.validateUser || 
      ((user) => ({ isValid: true, errors: [] }));
    
    const validation = formValidationFunction(userForm);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    // Check for duplicate username
    const duplicateUser = users.find(
      u => u.username === userForm.username && u.id !== userForm.id
    );
    
    if (duplicateUser) {
      setValidationErrors(['Username already exists']);
      return;
    }
    
    try {
      let success = false;
      
      // Try Auth system first
      if (dialogMode === 'add') {
        // Register new user with both Auth and database
        try {
          const result = await register(
            userForm.email, 
            passwordFields.password, 
            {
              username: userForm.username,
              name: userForm.name,
              role: userForm.role,
              permissions: userForm.permissions,
              status: 'active' // Admins creating users directly make them active
            }
          );
          
          if (result.success) {
            setSnackbar({
              open: true,
              message: 'User added successfully',
              severity: 'success'
            });
            
            // Refresh user list
            const allUsers = await getAllUsers();
            setUsers(allUsers.filter(user => user.status !== 'pending'));
            
            success = true;
          } else {
            throw new Error(result.message || 'User creation failed');
          }
        } catch (authError) {
          console.error('Auth system user creation failed:', authError);
          // Fall through to DataContext approach
        }
      } else if (dialogMode === 'edit') {
        // Update existing user
        try {
          const result = await updateUserRole(
            userForm.id,
            userForm.role,
            userForm.permissions,
            userForm.status
          );
          
          if (result.success) {
            setSnackbar({
              open: true,
              message: 'User updated successfully',
              severity: 'success'
            });
            
            // Refresh user list
            const allUsers = await getAllUsers();
            setUsers(allUsers.filter(user => user.status !== 'pending'));
            
            success = true;
          } else {
            throw new Error(result.message || 'User update failed');
          }
        } catch (authError) {
          console.error('Auth system user update failed:', authError);
          // Fall through to DataContext approach
        }
      }
      
      // If Auth system failed, use DataContext as fallback
      if (!success) {
        // Format data
        const formattedUser = {
          ...userForm,
          modifiedBy: currentUser?.username || 'anonymous',
          modifiedAt: new Date().toISOString()
        };
        
        // Add password hash for new users (DataContext only)
        if (dialogMode === 'add' && passwordFields.password) {
          // Simple obfuscation, not actual security
          formattedUser.passwordHash = btoa(passwordFields.password);
        }
        
        // Save to data context
        if (dialogMode === 'add') {
          const result = addEntity('Users', formattedUser);
          
          if (result) {
            setSnackbar({
              open: true,
              message: 'User added successfully (local only)',
              severity: 'success'
            });
            success = true;
          } else {
            setSnackbar({
              open: true,
              message: 'Error adding user locally',
              severity: 'error'
            });
          }
        } else {
          const updateSuccess = updateEntity('Users', selectedUser.id, formattedUser);
          
          if (updateSuccess) {
            setSnackbar({
              open: true,
              message: 'User updated successfully (local only)',
              severity: 'success'
            });
            success = true;
          } else {
            setSnackbar({
              open: true,
              message: 'Error updating user locally',
              severity: 'error'
            });
          }
        }
      }
      
      if (success) {
        setDialogOpen(false);
        setValidationErrors([]);
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle save permissions
  const handleSavePermissions = async () => {
    try {
      // Try Auth system first
      try {
        const result = await updateUserRole(
          selectedUser.id,
          selectedUser.role,
          userForm.permissions,
          selectedUser.status
        );
        
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Permissions updated successfully',
            severity: 'success'
          });
          
          // Refresh user list
          const allUsers = await getAllUsers();
          setUsers(allUsers.filter(user => user.status !== 'pending'));
          
          setDialogOpen(false);
          return;
        } else {
          throw new Error(result.message || 'Permission update failed');
        }
      } catch (authError) {
        console.error('Auth system permission update failed:', authError);
        // Fall through to DataContext approach
      }
      
      // Fallback to DataContext
      const success = updateEntity('Users', selectedUser.id, {
        ...selectedUser,
        permissions: userForm.permissions,
        modifiedBy: currentUser?.username || 'anonymous',
        modifiedAt: new Date().toISOString()
      });
      
      if (success) {
        setSnackbar({
          open: true,
          message: 'Permissions updated successfully (local only)',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Error updating permissions locally',
          severity: 'error'
        });
      }
      
      setDialogOpen(false);
    } catch (err) {
      console.error('Error updating permissions:', err);
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle user deletion
  const handleDeleteUser = (user) => {
    // Cannot delete yourself
    if (user.id === currentUser.id) {
      setSnackbar({
        open: true,
        message: 'You cannot delete your own account',
        severity: 'error'
      });
      return;
    }
    
    setSelectedUser(user);
    setConfirmDeleteOpen(true);
  };
  
  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedUser) {
      try {
        // Try Auth system first
        // Note: In a real system, you'd have an auth.deleteUser function
        // For now, just deactivate the user instead
        try {
          const result = await updateUserRole(
            selectedUser.id,
            selectedUser.role,
            selectedUser.permissions,
            'inactive' // Deactivate instead of delete
          );
          
          if (result.success) {
            setSnackbar({
              open: true,
              message: 'User deactivated successfully',
              severity: 'success'
            });
            
            // Refresh user list
            const allUsers = await getAllUsers();
            setUsers(allUsers.filter(user => user.status !== 'pending'));
            
            setConfirmDeleteOpen(false);
            setSelectedUser(null);
            return;
          } else {
            throw new Error(result.message || 'User deactivation failed');
          }
        } catch (authError) {
          console.error('Auth system user deactivation failed:', authError);
          // Fall through to DataContext approach
        }
        
        // Fallback to DataContext
        const success = deleteEntity('Users', selectedUser.id);
        
        if (success) {
          setSnackbar({
            open: true,
            message: 'User deleted successfully (local only)',
            severity: 'success'
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Error deleting user locally',
            severity: 'error'
          });
        }
      } catch (err) {
        console.error('Error deleting user:', err);
        setSnackbar({
          open: true,
          message: `Error: ${err.message}`,
          severity: 'error'
        });
      }
    }
    
    setConfirmDeleteOpen(false);
    setSelectedUser(null);
  };
  
  // Handle approving a pending user
  const handleApproveUser = async (user) => {
    try {
      const result = await approveUser(user.id);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'User approved successfully',
          severity: 'success'
        });
        
        // Refresh user lists
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter(user => user.status !== 'pending'));
        
        const awaitingUsers = await getPendingUsers();
        setPendingUsers(awaitingUsers);
      } else {
        throw new Error(result.message || 'User approval failed');
      }
    } catch (err) {
      console.error('Error approving user:', err);
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Handle rejecting a pending user
  const handleRejectUser = async (user) => {
    try {
      // This would call a server-side function to reject the user
      // For now, we'll just delete them from the pending list
      
      const result = await updateUserRole(
        user.id,
        user.role,
        user.permissions,
        'rejected' // Mark as rejected
      );
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'User rejected successfully',
          severity: 'success'
        });
        
        // Refresh pending users list
        const awaitingUsers = await getPendingUsers();
        setPendingUsers(awaitingUsers);
      } else {
        throw new Error(result.message || 'User rejection failed');
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
      setSnackbar({
        open: true,
        message: `Error: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Save to GitHub
  const handleSaveToGitHub = async () => {
    try {
      setSnackbar({
        open: true,
        message: 'Saving data to GitHub...',
        severity: 'info'
      });
      
      const success = await saveData();
      
      if (success) {
        setSnackbar({
          open: true,
          message: 'Data saved to GitHub successfully',
          severity: 'success'
        });
      } else {
        throw new Error('Failed to save to GitHub');
      }
    } catch (err) {
      console.error('GitHub save error:', err);
      setSnackbar({
        open: true,
        message: `GitHub save failed: ${err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Reset password
  const handleResetPassword = async (user) => {
    try {
      // Use the new reset password functionality
      const result = await resetPassword(user.email);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Password reset email sent',
          severity: 'success'
        });
      } else {
        throw new Error(result.message || 'Password reset failed');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      
      // Fallback to DataContext approach
      try {
        const success = updateEntity('Users', user.id, {
          ...user,
          passwordHash: btoa('Password123!'),
          modifiedBy: currentUser?.username || 'anonymous',
          modifiedAt: new Date().toISOString()
        });
        
        if (success) {
          setSnackbar({
            open: true,
            message: 'Password reset to "Password123!" (local only)',
            severity: 'success'
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Error resetting password locally',
            severity: 'error'
          });
        }
      } catch (fallbackErr) {
        setSnackbar({
          open: true,
          message: `Error: ${fallbackErr.message}`,
          severity: 'error'
        });
      }
    }
    
    handleCloseMenu();
  };
  
  // Handle table pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Filter users based on filters and search
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter
      const roleMatch = filterRole === 'All' || user.role === filterRole;
      
      return searchMatch && roleMatch;
    });
  }, [users, searchTerm, filterRole]);
  
  // Get paginated data
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);
  
  // Get role name by ID
  const getRoleName = (roleId) => {
    const role = availableRoles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown';
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get avatar background color based on role
  const getAvatarColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error.main';
      case 'manager':
        return 'warning.main';
      case 'user':
        return 'primary.main';
      default:
        return 'grey.500';
    }
  };
  
  // Get permission name by ID
  const getPermissionName = (permissionId) => {
    const permission = availablePermissions.find(p => p.id === permissionId);
    return permission ? permission.name : permissionId;
  };
  
  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  // Access control - only admins can access this page
  if (!isAdmin()) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Access denied. Only administrators can access user management.
      </Alert>
    );
  }
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        
        <Box>
          <Tooltip title="Save to GitHub">
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={handleSaveToGitHub}
              sx={{ mr: 1 }}
            >
              Save
            </Button>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddUser}
          >
            New User
          </Button>
        </Box>
      </Box>
      
      {/* Tabs for Users and Pending Users */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="user management tabs">
            <Tab label="Active Users" id="user-tab-0" />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Pending Approval
                  {pendingUsers.length > 0 && (
                    <Chip
                      label={pendingUsers.length}
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              } 
              id="user-tab-1" 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Search Users"
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={filterRole}
                    label="Role"
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <MenuItem value="All">All Roles</MenuItem>
                    {availableRoles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Users Table */}
          <Paper>
            {paginatedUsers.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: getAvatarColor(user.role),
                                mr: 1
                              }}
                            >
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body1">{user.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{user.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleName(user.role)}
                            size="small"
                            color={roleColors[user.role] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Array.isArray(user.permissions) ? (
                            user.permissions.map((permission) => (
                                <Chip
                                key={permission}
                                label={getPermissionName(permission)}
                                size="small"
                                variant="outlined"
                                />
                            ))
                            ) : (
                            <Typography variant="caption" color="text.secondary">No permissions</Typography>
                            )}
                        </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={user.status === 'active' ? 'Active' : 'Inactive'}
                            size="small"
                            color={user.status === 'active' ? 'success' : 'default'}
                            icon={user.status === 'active' ? <ActiveIcon /> : <BlockIcon />}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Actions">
                            <IconButton
                              size="small"
                              onClick={(e) => handleOpenMenu(e, user)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredUsers.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </TableContainer>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No users found matching your filters.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Try changing your search criteria or create a new user.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddUser}
                >
                  Create New User
                </Button>
              </Box>
            )}
          </Paper>
        </TabPanel>
        
        {/* Pending Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>Pending User Approval</Typography>
          
          {pendingUsers.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role || 'user'} 
                          color={user.role === 'admin' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Approve User">
                          <IconButton 
                            color="success" 
                            onClick={() => handleApproveUser(user)}
                            size="small"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject User">
                          <IconButton 
                            color="error"
                            onClick={() => handleRejectUser(user)}
                            size="small"
                          >
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton
                            color="primary"
                            onClick={() => handleViewUser(user)}
                            size="small"
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No pending users to approve.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New users who sign up will appear here for approval.
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>
      
      {/* User Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => {
          handleViewUser(menuUser);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleEditUser(menuUser);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleManagePermissions(menuUser);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <SecurityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Permissions</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleResetPassword(menuUser);
        }}>
          <ListItemIcon>
            <LockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reset Password</ListItemText>
        </MenuItem>
        
        <Divider />
        
        {/* Status change options */}
        {menuUser?.status === 'active' && menuUser?.id !== currentUser?.id && (
          <MenuItem onClick={() => handleStatusChange(menuUser, 'inactive')}>
            <ListItemIcon>
              <BlockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Deactivate User</ListItemText>
          </MenuItem>
        )}
        
        {menuUser?.status === 'inactive' && (
          <MenuItem onClick={() => handleStatusChange(menuUser, 'active')}>
            <ListItemIcon>
              <ActiveIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activate User</ListItemText>
          </MenuItem>
        )}
        
        <Divider />
        
        {menuUser?.id !== currentUser?.id && (
          <MenuItem 
            onClick={() => {
              handleDeleteUser(menuUser);
              handleCloseMenu();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete User</ListItemText>
          </MenuItem>
        )}
      </Menu>
      
      {/* Add/Edit User Dialog */}
      <Dialog
        open={dialogOpen && (dialogMode === 'add' || dialogMode === 'edit' || dialogMode === 'view')}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'Create New User' : 
           dialogMode === 'edit' ? 'Edit User' : 'User Details'}
        </DialogTitle>
        
        <DialogContent dividers>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              icon={<ErrorIcon />}
            >
              <Typography variant="subtitle2" gutterBottom>
                Please fix the following errors:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={userForm.username}
                onChange={handleFormChange}
                margin="normal"
                required
                disabled={dialogMode === 'view' || dialogMode === 'edit'}
                error={validationErrors.some(error => error.includes('username'))}
                helperText={validationErrors.find(error => error.includes('username'))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={userForm.name}
                onChange={handleFormChange}
                margin="normal"
                required
                disabled={dialogMode === 'view'}
                error={validationErrors.some(error => error.includes('name'))}
                helperText={validationErrors.find(error => error.includes('name'))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={userForm.email}
                onChange={handleFormChange}
                margin="normal"
                required
                disabled={dialogMode === 'view'}
                error={validationErrors.some(error => error.includes('email'))}
                helperText={validationErrors.find(error => error.includes('email'))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={userForm.role}
                  onChange={handleFormChange}
                  label="Role"
                  disabled={dialogMode === 'view'}
                >
                  {availableRoles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={userForm.status || 'active'} // Ensure there's always a value
                  onChange={handleFormChange}
                  label="Status"
                  disabled={dialogMode === 'view' || (selectedUser && selectedUser.id === currentUser.id)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {dialogMode === 'add' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="Password" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={passwordFields.showPassword ? 'text' : 'password'}
                    value={passwordFields.password}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                          >
                            {passwordFields.showPassword ? <VisibilityOffIcon /> : <ViewIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    name="confirmPassword"
                    type={passwordFields.showPassword ? 'text' : 'password'}
                    value={passwordFields.confirmPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                  />
                </Grid>
              </>
            )}
            
            {dialogMode === 'view' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="System Information" />
                  </Divider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Created At"
                    value={formatDate(userForm.createdAt)}
                    margin="normal"
                    disabled
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Login"
                    value={formatDate(userForm.lastLogin)}
                    margin="normal"
                    disabled
                  />
                </Grid>
                
                <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                    Permissions
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Array.isArray(userForm.permissions) && userForm.permissions.length > 0 ? (
                        userForm.permissions.map((permission) => (
                        <Chip
                            key={permission}
                            label={getPermissionName(permission)}
                            color="primary"
                            variant="outlined"
                        />
                        ))
                    ) : (
                        <Typography variant="caption" color="text.secondary">No permissions assigned</Typography>
                    )}
                    </Box>
                </Box>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CloseIcon />}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          
          {dialogMode !== 'view' && (
            <Button 
              onClick={handleSaveUser} 
              variant="contained" 
              color="primary"
              startIcon={<SaveIcon />}
            >
              {dialogMode === 'add' ? 'Create User' : 'Save Changes'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Permissions Dialog */}
      <Dialog
        open={dialogOpen && dialogMode === 'permissions'}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage Permissions</DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              User: {userForm.name} ({userForm.username})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {getRoleName(userForm.role)}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <FormGroup>
            {availablePermissions.map((permission) => (
              <FormControlLabel
                key={permission.id}
                control={
                  <Checkbox
                    checked={userForm.permissions?.includes(permission.id)}
                    onChange={() => handlePermissionChange(permission.id)}
                    name={permission.id}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{permission.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {permission.description}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSavePermissions} 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
          >
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the user <strong>{selectedUser?.name}</strong> ({selectedUser?.username})? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;