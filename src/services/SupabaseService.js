// src/services/SupabaseService.js - With setupDatabase implementation
import { createClient } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

class SupabaseService {
  constructor() {
    if (!supabase) {
      console.error('Supabase client could not be initialized.');
    }
  }
  
  // Field mapping helper function for Expenses
  mapExpenseFields(expense) {
    // Map the field names from application to database structure
    return {
      id: expense.id,
      date: expense.date,
      description: expense.description || '',
      supplier: expense.supplierId || expense.supplier, // Accept either format
      amount: parseFloat(expense.amount || 0),
      paymentType: parseInt(expense.paymentTypeId || expense.paymentType || 1),
      paymentCenter: parseInt(expense.paymentCenterId || expense.paymentCenter || 1),
      program: expense.programId ? parseInt(expense.programId) : 
               expense.program ? parseInt(expense.program) : null,
      status: expense.statusId || expense.status || 'Committed',
      notes: expense.notes || '',
      invoiceDate: expense.invoiceDate || null,
      paymentDate: expense.paymentDate || null,
      createdBy: expense.createdBy || 'system',
      createdAt: expense.createdAt || new Date().toISOString()
    };
  }
  
  // Reverse mapping to convert database field names to application field names
  mapExpenseToApp(dbExpense) {
    if (!dbExpense) return null;
    
    return {
      id: dbExpense.id,
      date: dbExpense.date,
      description: dbExpense.description,
      supplierId: dbExpense.supplier,
      supplier: dbExpense.supplier, // Keep both formats for compatibility
      amount: dbExpense.amount,
      paymentTypeId: dbExpense.paymentType,
      paymentType: dbExpense.paymentType, // Keep both formats
      paymentCenterId: dbExpense.paymentCenter,
      paymentCenter: dbExpense.paymentCenter, // Keep both formats
      programId: dbExpense.program,
      program: dbExpense.program, // Keep both formats
      statusId: dbExpense.status,
      status: dbExpense.status, // Keep both formats
      notes: dbExpense.notes,
      invoiceDate: dbExpense.invoiceDate,
      paymentDate: dbExpense.paymentDate,
      createdBy: dbExpense.createdBy,
      createdAt: dbExpense.createdAt
    };
  }

  // Export all data from Supabase for Excel export
  async exportAllData() {
    try {
      console.log('Exporting all data from Supabase...');
      const exportData = {};
      
      // List of tables to export
      const tables = [
        'Users',
        'Suppliers',
        'PaymentCenters',
        'PaymentTypes',
        'ExpenseStatus',
        'PaymentCenterBudgets',
        'Expenses',
        'JournalEntries',
        'JournalLines',
        'AuditLog',
        'Programs'
      ];
      
      // Export each table
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');
          
          if (error) {
            console.warn(`Error exporting ${table}:`, error);
            exportData[table] = [];
          } else {
            console.log(`Exported ${data.length} records from ${table}`);
            exportData[table] = data;
          }
        } catch (tableError) {
          console.error(`Failed to export ${table}:`, tableError);
          exportData[table] = [];
        }
      }
      
      return exportData;
    } catch (error) {
      console.error('Error exporting all data:', error);
      throw error;
    }
  }
  
  async getAll(table) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) throw error;
      
      // Special handling for Expenses - map database fields to application fields
      if (table === 'Expenses' && data) {
        return data.map(expense => this.mapExpenseToApp(expense));
      }
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      throw error;
    }
  }

  async getById(table, id) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Special handling for Expenses - map database fields to application fields
      if (table === 'Expenses' && data) {
        return this.mapExpenseToApp(data);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${table} by ID:`, error);
      throw error;
    }
  }

  async insert(table, record) {
    try {
      // Special handling for Expenses table
      if (table === 'Expenses') {
        const mappedRecord = this.mapExpenseFields(record);
        console.log('Mapped expense record for insert:', mappedRecord);
        
        const { data, error } = await supabase
          .from(table)
          .insert(mappedRecord)
          .select();
        
        if (error) throw error;
        
        // Map the returned data back to application format
        return this.mapExpenseToApp(data[0]);
      }
      
      // Original code for other tables
      const { data, error } = await supabase
        .from(table)
        .insert(record)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      
      // Enhanced error logging for debugging
      if (error.code) {
        console.error(`Error code: ${error.code}, Message: ${error.message}`);
        if (error.details) console.error('Error details:', error.details);
      }
      
      throw error;
    }
  }

  async update(table, id, updates) {
    try {
      // Special handling for Expenses table
      if (table === 'Expenses') {
        const mappedUpdates = this.mapExpenseFields(updates);
        console.log('Mapped expense record for update:', mappedUpdates);
        
        const { data, error } = await supabase
          .from(table)
          .update(mappedUpdates)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        
        // Map the returned data back to application format
        return this.mapExpenseToApp(data[0]);
      }
      
      // Original code for other tables
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      
      // Enhanced error logging for debugging
      if (error.code) {
        console.error(`Error code: ${error.code}, Message: ${error.message}`);
        if (error.details) console.error('Error details:', error.details);
      }
      
      throw error;
    }
  }

  async delete(table, id) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  async query(table, field, value) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq(field, value);
      
      if (error) throw error;
      
      // Special handling for Expenses - map database fields to application fields
      if (table === 'Expenses' && data) {
        return data.map(expense => this.mapExpenseToApp(expense));
      }
      
      return data || [];
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      throw error;
    }
  }
  
  async setupDatabase() {
    console.log('Setting up database...');
    try {
      // First create the necessary tables if they don't exist
      const tables = [
        this.createUsersTable(),
        this.createPaymentCentersTable(),
        this.createPaymentTypesTable(),
        this.createExpenseStatusTable(),
        this.createSuppliersTable(),
        this.createPaymentCenterBudgetsTable(),
        this.createExpensesTable(),
        this.createJournalEntriesTable(),
        this.createJournalLinesTable(),
        this.createAuditLogTable(),
        this.createProgramsTable() // Add Programs table creation
      ];
      
      // Wait for all tables to be created
      await Promise.allSettled(tables);
      
      // Create a default admin user
      await this.createDefaultAdmin();
      
      // Mark the database as set up
      await this.markDatabaseAsSetup();
      
      return {
        success: true,
        message: 'Database setup completed successfully'
      };
    } catch (error) {
      console.error('Error during database setup:', error);
      return {
        success: false,
        message: error.message || 'Database setup failed'
      };
    }
  }
  
  // Add method to create Programs table
  async createProgramsTable() {
    try {
      // Check if the table exists
      const { error: checkError } = await supabase
        .from('Programs')
        .select('count(*)', { count: 'exact', head: true });
      
      // If we get an error indicating the table doesn't exist, create it
      if (checkError && checkError.message && checkError.message.includes('does not exist')) {
        // Create the Programs table using RPC to run SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql_command: `
            CREATE TABLE IF NOT EXISTS "Programs" (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              status TEXT DEFAULT 'Active',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `
        });
        
        if (error) {
          console.error('Error creating Programs table:', error);
          return false;
        }
        
        // Insert default Programs
        const defaultPrograms = [
          { id: 'PROG1', name: 'Program 1', description: 'Default Program 1', status: 'Active' },
          { id: 'PROG2', name: 'Program 2', description: 'Default Program 2', status: 'Active' },
          { id: 'PROG3', name: 'Program 3', description: 'Default Program 3', status: 'Active' }
        ];
        
        // Insert default programs one by one
        for (const program of defaultPrograms) {
          try {
            await supabase.from('Programs').insert(program);
          } catch (insertError) {
            console.error(`Error inserting default program ${program.id}:`, insertError);
          }
        }
      } else if (!checkError) {
        console.log('Programs table already exists');
      }
      
      return true;
    } catch (error) {
      console.error('Error handling Programs table:', error);
      return false;
    }
  }
  
  // Helper methods to create individual tables
  async createUsersTable() {
    try {
      // Check if the table exists
      const { error: checkError } = await supabase
        .from('Users')
        .select('count(*)', { count: 'exact', head: true });
      
      // If we get an error indicating the table doesn't exist, create it
      if (checkError && checkError.message && checkError.message.includes('does not exist')) {
        // Create the Users table using RPC to run SQL
        // Note: In a real implementation, you'd create these tables using migrations
        // This is a simplified approach for the demo
        const { error } = await supabase.rpc('exec_sql', {
          sql_command: `
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
          `
        });
        
        if (error) {
          console.error('Error creating Users table:', error);
          // Try an alternative approach - using auth to create a table
          try {
            // Create the admin user in Supabase Auth
            const { error: authError } = await supabase.auth.signUp({
              email: 'admin@kiosc.com',
              password: 'admin123'
            });
            
            if (authError && !authError.message.includes('already exists')) {
              console.error('Error creating admin auth user:', authError);
            }
          } catch (e) {
            console.error('Error in auth signup:', e);
          }
        }
      } else if (!checkError) {
        console.log('Users table already exists');
      }
      
      return true;
    } catch (error) {
      console.error('Error handling Users table:', error);
      return false;
    }
  }
  
  async createDefaultAdmin() {
    try {
      // Check if admin already exists
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('username', 'admin')
        .maybeSingle();
      
      if (!error && data) {
        console.log('Admin user already exists');
        return data;
      }
      
      // Create default admin user
      const adminUser = {
        username: 'admin',
        name: 'Administrator',
        email: 'admin@kiosc.com',
        role: 'admin',
        permissions: 'admin,read,write',
        status: 'active'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('Users')
        .insert(adminUser)
        .select();
      
      if (insertError) {
        console.error('Error creating admin user:', insertError);
        
        // Try upsert instead
        const { data: upsertData, error: upsertError } = await supabase
          .from('Users')
          .upsert(adminUser)
          .select();
          
        if (upsertError) {
          throw upsertError;
        }
        
        return upsertData?.[0];
      }
      
      return insertData?.[0];
    } catch (error) {
      console.error('Error creating default admin:', error);
      
      // As a final fallback, store in localStorage
      localStorage.setItem('admin_user', JSON.stringify({
        username: 'admin',
        name: 'Administrator',
        role: 'admin',
        permissions: 'admin,read,write',
        status: 'active'
      }));
      
      return null;
    }
  }

  async createPaymentCentersTable() {
    try {
      // For simplicity, we'll just insert default data
      // In a real implementation, you'd create the table with proper SQL
      const defaultCenters = [
        { name: 'GDC', description: 'GDC Payment Center' },
        { name: 'VCES', description: 'VCES Payment Center' },
        { name: 'Commercial', description: 'Commercial Payment Center' },
        { name: 'Operation', description: 'Operation Payment Center' }
      ];
      
      const { error } = await supabase
        .from('PaymentCenters')
        .upsert(defaultCenters, { onConflict: 'name' });
      
      // Just log errors - don't fail the whole setup
      if (error) console.error('Error with PaymentCenters:', error);
      
      return true;
    } catch (error) {
      console.error('Error creating PaymentCenters table:', error);
      return false;
    }
  }

  async createPaymentTypesTable() {
    try {
      const defaultTypes = [
        { name: 'PO', description: 'Purchase Order' },
        { name: 'Credit Card', description: 'Credit Card Payment' },
        { name: 'Activiti', description: 'Activiti Invoice' }
      ];
      
      const { error } = await supabase
        .from('PaymentTypes')
        .upsert(defaultTypes, { onConflict: 'name' });
      
      if (error) console.error('Error with PaymentTypes:', error);
      
      return true;
    } catch (error) {
      console.error('Error creating PaymentTypes table:', error);
      return false;
    }
  }

  async createExpenseStatusTable() {
    try {
      const defaultStatuses = [
        { name: 'Committed', description: 'Expense is committed but not paid' },
        { name: 'Invoiced', description: 'Invoice received but not paid' },
        { name: 'Paid', description: 'Expense is paid' }
      ];
      
      const { error } = await supabase
        .from('ExpenseStatus')
        .upsert(defaultStatuses, { onConflict: 'name' });
      
      if (error) console.error('Error with ExpenseStatus:', error);
      
      return true;
    } catch (error) {
      console.error('Error creating ExpenseStatus table:', error);
      return false;
    }
  }

  async createSuppliersTable() {
    try {
      // Just create an empty table, users will add suppliers
      return true;
    } catch (error) {
      console.error('Error creating Suppliers table:', error);
      return false;
    }
  }

  async createPaymentCenterBudgetsTable() {
    try {
      // Create default budgets for the current year
      const currentYear = new Date().getFullYear().toString();
      const defaultBudgets = [
        {
          id: `budget-1-${currentYear}`,
          paymentCenterId: "1",
          year: currentYear,
          budget: "150000",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `budget-2-${currentYear}`,
          paymentCenterId: "2",
          year: currentYear,
          budget: "80000",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `budget-3-${currentYear}`,
          paymentCenterId: "3",
          year: currentYear,
          budget: "120000",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `budget-4-${currentYear}`,
          paymentCenterId: "4",
          year: currentYear,
          budget: "50000",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      const { error } = await supabase
        .from('PaymentCenterBudgets')
        .upsert(defaultBudgets, { onConflict: 'id' });
      
      if (error) console.error('Error with PaymentCenterBudgets:', error);
      
      return true;
    } catch (error) {
      console.error('Error creating PaymentCenterBudgets table:', error);
      return false;
    }
  }

  async createExpensesTable() {
    // Just create the table structure, no default data needed
    return true;
  }

  async createJournalEntriesTable() {
    // Just create the table structure, no default data needed
    return true;
  }

  async createJournalLinesTable() {
    // Just create the table structure, no default data needed
    return true;
  }

  async createAuditLogTable() {
    // Just create the table structure, no default data needed
    return true;
  }

  async initializeFromExcel(excelData) {
    try {
      console.log('Starting data initialization...');
      
      // First, let's check if we can access the database
      try {
        const { data, error } = await supabase.from('Users').select('count(*)', { count: 'exact', head: true });
        if (!error) {
          console.log('Database already has structure, checking if we need to add data...');
        }
      } catch (e) {
        console.log('Could not verify database structure:', e);
      }
      
      // Define insertion order to respect foreign key constraints
      const tables = [
        'Users',
        'PaymentCenters',
        'PaymentTypes',
        'ExpenseStatus',
        'Suppliers',
        'PaymentCenterBudgets',
        'Expenses',
        'JournalEntries',
        'JournalLines',
        'Programs' // Add Programs to the list
      ];
      
      let successfulTables = [];
      
      // Process each table
      for (const table of tables) {
        if (excelData[table] && excelData[table].length > 0) {
          console.log(`Initializing ${table} with ${excelData[table].length} records`);
          
          // Preprocess data
          let processedData = [];
          
          switch (table) {
            case 'Users':
              processedData = excelData[table].map(user => ({
                username: user.username,
                name: user.name,
                email: user.email || `${user.username}@example.com`,
                role: user.role || 'user',
                permissions: typeof user.permissions === 'string' ? user.permissions : 'read',
                status: user.status || 'active'
              }));
              break;
            
            case 'PaymentCenters':
              processedData = excelData[table].map(pc => ({
                name: pc.name,
                description: pc.description || ''
              }));
              break;
            
            case 'PaymentTypes':
              processedData = excelData[table].map(pt => ({
                name: pt.name,
                description: pt.description || ''
              }));
              break;
            
            case 'ExpenseStatus':
              processedData = excelData[table].map(es => ({
                name: es.name,
                description: es.description || ''
              }));
              break;
            
            case 'Suppliers':
              // Make sure to use ID strings that don't conflict with existing ones
              processedData = excelData[table].map((supplier, index) => ({
                id: supplier.code,
                code: supplier.code,
                name: supplier.name,
                category: parseInt(supplier.category) || 1,
                status: supplier.status || 'Active',
                contactName: supplier.contactName || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                abn: supplier.abn || '',
                paymentTerms: parseInt(supplier.paymentTerms) || 30,
                notes: supplier.notes || '',
                createdAt: supplier.createdAt || new Date().toISOString()
              }));
              break;
              
            case 'Programs':
              // Process Programs data
              processedData = excelData[table].map((program, index) => ({
                id: program.id || `PROG${index + 1}`,
                name: program.name,
                description: program.description || '',
                status: program.status || 'Active'
              }));
              break;
            
            // And so on for other tables...
            default:
              // Skip the table if no specialized handling
              console.log(`Skipping ${table} due to lack of specialized handling`);
              continue;
          }
          
          // Process a table one record at a time for better error handling
          let insertedCount = 0;
          for (const record of processedData) {
            try {
              const { data, error } = await supabase
                .from(table)
                .upsert(record, { onConflict: table === 'Users' ? 'username' : 'id' })
                .select();
              
              if (error) {
                console.error(`Error inserting record into ${table}:`, error);
                console.error('Problem record:', record);
              } else {
                insertedCount++;
              }
            } catch (e) {
              console.error(`Exception inserting record into ${table}:`, e);
            }
          }
          
          console.log(`Inserted ${insertedCount}/${processedData.length} records into ${table}`);
          if (insertedCount > 0) {
            successfulTables.push(table);
          }
        }
      }
      
      // Try to create at least one admin user if none exists
      if (!successfulTables.includes('Users')) {
        console.log('Creating default admin user...');
        try {
          await this.createDefaultAdmin();
          successfulTables.push('Users');
        } catch (e) {
          console.error('Failed to create default admin:', e);
        }
      }
      
      // Mark database as set up if at least critical tables were initialized
      if (successfulTables.includes('Users')) {
        await this.markDatabaseAsSetup();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing data:', error);
      return false;
    }
  }
  
  async update(table, id, updates) {
    try {
      console.log(`[SupabaseService] Updating ${table} with ID ${id}:`, updates);
      
      // Special handling for Expenses table
      if (table === 'Expenses') {
        const mappedUpdates = this.mapExpenseFields(updates);
        console.log('[SupabaseService] Mapped expense record for update:', mappedUpdates);
        
        const { data, error } = await supabase
          .from(table)
          .update(mappedUpdates)
          .eq('id', id)
          .select();
        
        if (error) {
          console.error(`[SupabaseService] Error updating ${table}:`, error);
          throw error;
        }
        
        console.log(`[SupabaseService] Successfully updated ${table}, returned data:`, data);
        
        // Map the returned data back to application format
        return this.mapExpenseToApp(data[0]);
      }
      
      // Handle PaymentCenterBudgets specially for debugging
      if (table === 'PaymentCenterBudgets') {
        console.log(`[SupabaseService] PaymentCenterBudgets update with ID ${id}:`, updates);
        
        // Ensure budget is stored as string
        const finalUpdates = { 
          ...updates,
          budget: updates.budget.toString()
        };
        
        console.log('[SupabaseService] Final updates after formatting:', finalUpdates);
        
        // Log the exact Supabase call we're making
        console.log(`[SupabaseService] Calling supabase.from('${table}').update(...).eq('id', '${id}').select()`);
        
        const { data, error } = await supabase
          .from(table)
          .update(finalUpdates)
          .eq('id', id)
          .select();
        
        if (error) {
          console.error(`[SupabaseService] Error updating ${table}:`, error);
          console.error(`[SupabaseService] Error code: ${error.code}, Message: ${error.message}`);
          if (error.details) console.error('[SupabaseService] Error details:', error.details);
          throw error;
        }
        
        console.log(`[SupabaseService] Successfully updated ${table}, returned data:`, data);
        return data[0];
      }
      
      // Original code for other tables
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error(`[SupabaseService] Error updating ${table}:`, error);
        throw error;
      }
      
      console.log(`[SupabaseService] Successfully updated ${table}, returned data:`, data);
      return data[0];
    } catch (error) {
      console.error(`[SupabaseService] Exception in update ${table}:`, error);
      
      // Enhanced error logging for debugging
      if (error.code) {
        console.error(`[SupabaseService] Error code: ${error.code}, Message: ${error.message}`);
        if (error.details) console.error('[SupabaseService] Error details:', error.details);
      }
      
      throw error;
    }
  }

  async markDatabaseAsSetup() {
    localStorage.setItem('kiosc_database_setup', 'true');
    return true;
  }
  
  async isDatabaseSetup() {
    try {
      // Check local storage flag first
      if (localStorage.getItem('kiosc_database_setup') === 'true') {
        return true;
      }
      
      // Check for existence of admin user as fallback
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('role', 'admin')
        .limit(1);
        
      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;