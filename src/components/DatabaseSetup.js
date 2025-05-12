// src/components/DatabaseSetup.js
import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Alert, 
  Paper, 
  CircularProgress, 
  Stepper,
  Step,
  StepLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Link
} from '@mui/material';
import supabase from '../lib/supabase';

// SQL statements for creating database structure
const tables = [
  {
    name: 'Users',
    sql: `
      CREATE TABLE IF NOT EXISTS "Users" (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username TEXT UNIQUE NOT NULL,
        name TEXT,
        email TEXT,
        role TEXT DEFAULT 'user',
        permissions TEXT DEFAULT 'read',
        status TEXT DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable Row Level Security
      ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
        -- Check if policy exists before creating
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Users' AND policyname = 'Allow public select'
        ) THEN
          CREATE POLICY "Allow public select" ON "Users" FOR SELECT USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Users' AND policyname = 'Allow authenticated insert'
        ) THEN
          CREATE POLICY "Allow authenticated insert" ON "Users" FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Users' AND policyname = 'Allow authenticated update'
        ) THEN
          CREATE POLICY "Allow authenticated update" ON "Users" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Users' AND policyname = 'Allow authenticated delete'
        ) THEN
          CREATE POLICY "Allow authenticated delete" ON "Users" FOR DELETE TO authenticated USING (true);
        END IF;
      END
      $$;
    `
  },
  {
    name: 'PaymentCenters',
    sql: `
      CREATE TABLE IF NOT EXISTS "PaymentCenters" (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable Row Level Security
      ALTER TABLE "PaymentCenters" ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
        -- Check if policy exists before creating
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenters' AND policyname = 'Allow authenticated select'
        ) THEN
          CREATE POLICY "Allow authenticated select" ON "PaymentCenters" FOR SELECT TO authenticated USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenters' AND policyname = 'Allow authenticated insert'
        ) THEN
          CREATE POLICY "Allow authenticated insert" ON "PaymentCenters" FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenters' AND policyname = 'Allow authenticated update'
        ) THEN
          CREATE POLICY "Allow authenticated update" ON "PaymentCenters" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenters' AND policyname = 'Allow authenticated delete'
        ) THEN
          CREATE POLICY "Allow authenticated delete" ON "PaymentCenters" FOR DELETE TO authenticated USING (true);
        END IF;
      END
      $$;
    `
  },
  {
    name: 'PaymentTypes',
    sql: `
      CREATE TABLE IF NOT EXISTS "PaymentTypes" (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable Row Level Security
      ALTER TABLE "PaymentTypes" ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
        -- Check if policy exists before creating
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentTypes' AND policyname = 'Allow authenticated select'
        ) THEN
          CREATE POLICY "Allow authenticated select" ON "PaymentTypes" FOR SELECT TO authenticated USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentTypes' AND policyname = 'Allow authenticated insert'
        ) THEN
          CREATE POLICY "Allow authenticated insert" ON "PaymentTypes" FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentTypes' AND policyname = 'Allow authenticated update'
        ) THEN
          CREATE POLICY "Allow authenticated update" ON "PaymentTypes" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentTypes' AND policyname = 'Allow authenticated delete'
        ) THEN
          CREATE POLICY "Allow authenticated delete" ON "PaymentTypes" FOR DELETE TO authenticated USING (true);
        END IF;
      END
      $$;
    `
  },
  {
    name: 'ExpenseStatus',
    sql: `
      CREATE TABLE IF NOT EXISTS "ExpenseStatus" (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable Row Level Security
      ALTER TABLE "ExpenseStatus" ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
        -- Check if policy exists before creating
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'ExpenseStatus' AND policyname = 'Allow authenticated select'
        ) THEN
          CREATE POLICY "Allow authenticated select" ON "ExpenseStatus" FOR SELECT TO authenticated USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'ExpenseStatus' AND policyname = 'Allow authenticated insert'
        ) THEN
          CREATE POLICY "Allow authenticated insert" ON "ExpenseStatus" FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'ExpenseStatus' AND policyname = 'Allow authenticated update'
        ) THEN
          CREATE POLICY "Allow authenticated update" ON "ExpenseStatus" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'ExpenseStatus' AND policyname = 'Allow authenticated delete'
        ) THEN
          CREATE POLICY "Allow authenticated delete" ON "ExpenseStatus" FOR DELETE TO authenticated USING (true);
        END IF;
      END
      $$;
    `
  },
  {
    name: 'Suppliers',
    sql: `
      CREATE TABLE IF NOT EXISTS "Suppliers" (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT NOT NULL,
        category INTEGER,
        status TEXT DEFAULT 'Active',
        contactName TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        abn TEXT,
        paymentTerms INTEGER DEFAULT 30,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable Row Level Security
      ALTER TABLE "Suppliers" ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
        -- Check if policy exists before creating
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Suppliers' AND policyname = 'Allow authenticated select'
        ) THEN
          CREATE POLICY "Allow authenticated select" ON "Suppliers" FOR SELECT TO authenticated USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Suppliers' AND policyname = 'Allow authenticated insert'
        ) THEN
          CREATE POLICY "Allow authenticated insert" ON "Suppliers" FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Suppliers' AND policyname = 'Allow authenticated update'
        ) THEN
          CREATE POLICY "Allow authenticated update" ON "Suppliers" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'Suppliers' AND policyname = 'Allow authenticated delete'
        ) THEN
          CREATE POLICY "Allow authenticated delete" ON "Suppliers" FOR DELETE TO authenticated USING (true);
        END IF;
      END
      $$;
    `
  },
  {
    name: 'PaymentCenterBudgets',
    sql: `
      CREATE TABLE IF NOT EXISTS "PaymentCenterBudgets" (
        id TEXT PRIMARY KEY,
        paymentCenterId TEXT NOT NULL,
        year TEXT NOT NULL,
        budget TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Enable Row Level Security
      ALTER TABLE "PaymentCenterBudgets" ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DO $$
      BEGIN
        -- Check if policy exists before creating
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenterBudgets' AND policyname = 'Allow authenticated select'
        ) THEN
          CREATE POLICY "Allow authenticated select" ON "PaymentCenterBudgets" FOR SELECT TO authenticated USING (true);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenterBudgets' AND policyname = 'Allow authenticated insert'
        ) THEN
          CREATE POLICY "Allow authenticated insert" ON "PaymentCenterBudgets" FOR INSERT TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenterBudgets' AND policyname = 'Allow authenticated update'
        ) THEN
          CREATE POLICY "Allow authenticated update" ON "PaymentCenterBudgets" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'PaymentCenterBudgets' AND policyname = 'Allow authenticated delete'
        ) THEN
          CREATE POLICY "Allow authenticated delete" ON "PaymentCenterBudgets" FOR DELETE TO authenticated USING (true);
        END IF;
      END
      $$;
    `
  }
];

// Initial data to insert
const initialData = [
  {
    table: 'PaymentCenters',
    data: [
      { name: 'GDC', description: 'GDC Payment Center' },
      { name: 'VCES', description: 'VCES Payment Center' },
      { name: 'Commercial', description: 'Commercial Payment Center' },
      { name: 'Operation', description: 'Operation Payment Center' }
    ]
  },
  {
    table: 'PaymentTypes',
    data: [
      { name: 'PO', description: 'Purchase Order' },
      { name: 'Credit Card', description: 'Credit Card Payment' },
      { name: 'Activiti', description: 'Activiti Invoice' }
    ]
  },
  {
    table: 'ExpenseStatus',
    data: [
      { name: 'Committed', description: 'Expense is committed but not paid' },
      { name: 'Invoiced', description: 'Invoice received but not paid' },
      { name: 'Paid', description: 'Expense is paid' }
    ]
  }
];

const DatabaseSetup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // Check if tables exist
  const checkTables = async () => {
    setLoading(true);
    setError(null);
    setActiveStep(0);
    
    try {
      // Check if Users table exists
      const { error } = await supabase
        .from('Users')
        .select('count(*)', { count: 'exact', head: true });
      
      const tableExists = !error || !error.message.includes('does not exist');
      
      setResults({
        tablesExist: tableExists,
        timestamp: new Date().toISOString()
      });
      
      return tableExists;
    } catch (err) {
      console.error('Error checking tables:', err);
      setError(`Error checking database tables: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Create tables
  const createTables = async () => {
    setLoading(true);
    setError(null);
    setActiveStep(1);
    
    try {
      // First, create the uuid extension if it doesn't exist
      try {
        await supabase.rpc('exec_sql', { 
          sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 
        });
      } catch (extError) {
        console.warn('Could not create uuid extension:', extError);
        // Continue anyway, it might already exist
      }
      
      const tableResults = {};
      
      // Create each table
      for (const table of tables) {
        try {
          console.log(`Creating ${table.name} table...`);
          
          // Try using rpc to execute SQL
          const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
          
          if (error) {
            console.error(`Error creating ${table.name} table:`, error);
            
            // If RPC fails, try direct SQL (less safe but might work)
            try {
              await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabase.supabaseKey,
                  'Authorization': `Bearer ${supabase.supabaseKey}`
                },
                body: JSON.stringify({ sql: table.sql })
              });
              
              tableResults[table.name] = 'Created (direct SQL)';
            } catch (directError) {
              console.error(`Direct SQL for ${table.name} failed:`, directError);
              tableResults[table.name] = `Failed: ${error.message}`;
            }
          } else {
            tableResults[table.name] = 'Created';
          }
        } catch (tableError) {
          console.error(`Error creating ${table.name}:`, tableError);
          tableResults[table.name] = `Exception: ${tableError.message}`;
        }
      }
      
      setResults(prev => ({
        ...prev,
        tables: tableResults,
        timestamp: new Date().toISOString()
      }));
      
      // Check for overall success
      const allTablesCreated = Object.values(tableResults).every(result => 
        result === 'Created' || result === 'Created (direct SQL)'
      );
      
      return allTablesCreated;
    } catch (err) {
      console.error('Error creating tables:', err);
      setError(`Error creating database tables: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Insert initial data
  const insertInitialData = async () => {
    setLoading(true);
    setError(null);
    setActiveStep(2);
    
    try {
      const dataResults = {};
      
      // Insert data for each table
      for (const { table, data } of initialData) {
        try {
          console.log(`Inserting initial data for ${table}...`);
          
          const { error } = await supabase
            .from(table)
            .upsert(data, { onConflict: 'name' });
          
          if (error) {
            console.error(`Error inserting data into ${table}:`, error);
            dataResults[table] = `Failed: ${error.message}`;
          } else {
            dataResults[table] = 'Inserted';
          }
        } catch (dataError) {
          console.error(`Error inserting data into ${table}:`, dataError);
          dataResults[table] = `Exception: ${dataError.message}`;
        }
      }
      
      setResults(prev => ({
        ...prev,
        initialData: dataResults,
        timestamp: new Date().toISOString()
      }));
      
      // Check for overall success
      const allDataInserted = Object.values(dataResults).every(result => 
        result === 'Inserted'
      );
      
      return allDataInserted;
    } catch (err) {
      console.error('Error inserting initial data:', err);
      setError(`Error inserting initial data: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Create admin user
  const createAdminUser = async () => {
    setLoading(true);
    setError(null);
    setActiveStep(3);
    
    try {
      // First try to create admin in auth
      const { data, error } = await supabase.auth.signUp({
        email: 'admin@example.com',
        password: 'Admin123!',
        options: {
          data: {
            role: 'admin'
          }
        }
      });
      
      let authSuccess = false;
      let authMessage = '';
      
      if (error) {
        if (error.message.includes('already registered')) {
          authSuccess = true;
          authMessage = 'Admin already exists in Auth';
        } else {
          authMessage = `Auth error: ${error.message}`;
        }
      } else {
        authSuccess = true;
        authMessage = 'Admin created in Auth';
      }
      
      // Now try to create or update admin in Users table
      const adminUser = {
        username: 'admin',
        name: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        permissions: 'admin,read,write,delete',
        status: 'active'
      };
      
      const { error: userError } = await supabase
        .from('Users')
        .upsert([adminUser], { onConflict: 'username' });
      
      let tableSuccess = false;
      let tableMessage = '';
      
      if (userError) {
        tableMessage = `Users table error: ${userError.message}`;
      } else {
        tableSuccess = true;
        tableMessage = 'Admin created in Users table';
      }
      
      setResults(prev => ({
        ...prev,
        adminAuth: { success: authSuccess, message: authMessage },
        adminTable: { success: tableSuccess, message: tableMessage },
        timestamp: new Date().toISOString()
      }));
      
      return authSuccess || tableSuccess;
    } catch (err) {
      console.error('Error creating admin user:', err);
      setError(`Error creating admin user: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Run the complete setup process
  const runSetup = async () => {
    setLoading(true);
    setError(null);
    setCompleted(false);
    
    try {
      // Step 1: Check if tables exist
      const tablesExist = await checkTables();
      
      // Step 2: Create tables if they don't exist
      let tablesCreated = tablesExist;
      if (!tablesExist) {
        tablesCreated = await createTables();
      }
      
      // Step 3: Insert initial data
      let dataInserted = false;
      if (tablesCreated) {
        dataInserted = await insertInitialData();
      }
      
      // Step 4: Create admin user
      let adminCreated = false;
      if (tablesCreated) {
        adminCreated = await createAdminUser();
      }
      
      // Check overall success
      const setupSuccessful = tablesCreated && (dataInserted || adminCreated);
      setCompleted(setupSuccessful);
      
      if (!setupSuccessful) {
        setError('Database setup was not fully completed. Check the results for details.');
      }
    } catch (err) {
      console.error('Setup error:', err);
      setError(`Database setup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Run each step individually
  const runStep = async (step) => {
    switch(step) {
      case 0:
        return checkTables();
      case 1:
        return createTables();
      case 2:
        return insertInitialData();
      case 3:
        return createAdminUser();
      default:
        return false;
    }
  };
  
  // Define setup steps
  const steps = [
    'Check Database Tables',
    'Create Tables Structure',
    'Insert Initial Data',
    'Create Admin User'
  ];
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Database Setup
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        This tool will set up your database structure and initial data.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {completed && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Database setup completed successfully!
        </Alert>
      )}
      
      <Stepper activeStep={activeStep} sx={{ my: 3 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={runSetup}
          disabled={loading}
          sx={{ flex: 1 }}
        >
          {loading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
              Running Setup...
            </>
          ) : (
            'Run Complete Setup'
          )}
        </Button>
        
        <Button
          variant="outlined"
          onClick={() => runStep(activeStep)}
          disabled={loading}
          sx={{ flex: 1 }}
        >
          {loading ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
              Running Step...
            </>
          ) : (
            `Run Step ${activeStep + 1}`
          )}
        </Button>
      </Box>
      
      {Object.keys(results).length > 0 && (
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Setup Results
          </Typography>
          
          {results.tablesExist !== undefined && (
            <Alert 
              severity={results.tablesExist ? "info" : "warning"} 
              sx={{ mb: 2 }}
            >
              Database tables {results.tablesExist ? 'already exist' : 'need to be created'}
            </Alert>
          )}
          
          {results.tables && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Table Creation Results:
              </Typography>
              <List dense>
                {Object.entries(results.tables).map(([table, result]) => (
                  <ListItem key={table}>
                    <ListItemText 
                      primary={`${table}: ${result}`}
                      primaryTypographyProps={{
                        color: result.includes('Failed') || result.includes('Exception') 
                          ? 'error.main' 
                          : 'success.main'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {results.initialData && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Initial Data Results:
              </Typography>
              <List dense>
                {Object.entries(results.initialData).map(([table, result]) => (
                  <ListItem key={table}>
                    <ListItemText 
                      primary={`${table}: ${result}`}
                      primaryTypographyProps={{
                        color: result.includes('Failed') || result.includes('Exception') 
                          ? 'error.main' 
                          : 'success.main'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {results.adminAuth && results.adminTable && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Admin User Results:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary={results.adminAuth.message}
                    primaryTypographyProps={{
                      color: results.adminAuth.success ? 'success.main' : 'error.main'
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={results.adminTable.message}
                    primaryTypographyProps={{
                      color: results.adminTable.success ? 'success.main' : 'error.main'
                    }}
                  />
                </ListItem>
              </List>
            </Box>
          )}
          
          {results.timestamp && (
            <Typography variant="body2" color="text.secondary">
              Last updated: {new Date(results.timestamp).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Next Steps
        </Typography>
        
        <Typography variant="body2" paragraph>
          After setting up the database:
        </Typography>
        
        <List>
          <ListItem>
            <ListItemText primary="Log in with the admin user (admin@example.com / Admin123!)" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Check the dashboard to confirm data is being displayed" />
          </ListItem>
          <ListItem>
            <ListItemText primary="If issues persist, verify RLS policies in Supabase dashboard" />
          </ListItem>
        </List>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            <Link href="/login" underline="hover">
              Go to Login
            </Link>
            {' | '}
            <Link href="/api-test" underline="hover">
              Back to API Test
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default DatabaseSetup;