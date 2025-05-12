// src/contexts/DataContext.js - Modified for Supabase
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import supabaseService from '../services/SupabaseService';
import pdfExporter from '../utils/PdfExporter';
import csvExporter from '../utils/CsvExporter';
import { useAuth } from './AuthContext';

// Create context
const DataContext = createContext();

// Context provider component
export const DataProvider = ({ children }) => {
  // State for all data
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [initialized, setInitialized] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Get currentUser from AuthContext
  const { currentUser } = useAuth();
  
  // Add this function to handle CSV-formatted permissions
  const parseCSVPermissions = (permissionsString) => {
    if (!permissionsString) return [];
    if (Array.isArray(permissionsString)) return permissionsString;
    
    return permissionsString.split(',').map(perm => perm.trim());
  };
  
  // Add program initialization function
  const initializePrograms = useCallback(async () => {
    try {
      // Check if Programs exist
      const programs = await supabaseService.getAll('Programs');
      
      if (!programs || programs.length === 0) {
        console.log('No programs found, initializing default programs...');
        
        // Sample programs to create
        const defaultPrograms = [
          { id: 'PROG1', name: 'Program 1', description: 'Default Program 1', status: 'Active' },
          { id: 'PROG2', name: 'Program 2', description: 'Default Program 2', status: 'Active' },
          { id: 'PROG3', name: 'Program 3', description: 'Default Program 3', status: 'Active' }
        ];
        
        // Insert default programs
        for (const program of defaultPrograms) {
          await supabaseService.insert('Programs', program);
        }
        
        // Fetch the newly created programs
        const newPrograms = await supabaseService.getAll('Programs');
        
        // Update local state
        setData(prevData => ({
          ...prevData,
          Programs: newPrograms
        }));
        
        return newPrograms;
      }
      
      return programs;
    } catch (error) {
      console.error('Error initializing programs:', error);
      return [];
    }
  }, []);
  
  // Initialize data from Supabase
  const initializeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let newData = {};
      
      // List of collections to load
      const collections = [
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
        'Programs'  // Add Programs to the list
      ];
      
      // Load each collection from Supabase
      for (const collection of collections) {
        try {
          const collectionData = await supabaseService.getAll(collection);
          newData[collection] = collectionData;
          
          console.log(`Loaded ${collectionData.length} records from ${collection}`);
        } catch (collectionError) {
          console.warn(`Could not load ${collection}:`, collectionError);
          // Create empty array for missing collections
          newData[collection] = [];
          
          // Special handling for Programs - try to initialize if missing
          if (collection === 'Programs') {
            try {
              const programs = await initializePrograms();
              if (programs && programs.length > 0) {
                newData.Programs = programs;
                console.log(`Initialized ${programs.length} Programs`);
              }
            } catch (progError) {
              console.error('Failed to initialize Programs:', progError);
            }
          }
        }
      }
      
      // Process users to handle CSV permissions format
      if (newData.Users) {
        newData.Users = newData.Users.map(user => ({
          ...user,
          permissions: parseCSVPermissions(user.permissions)
        }));
      }
      
      // Ensure JournalEntries collection exists
      if (!newData.JournalEntries) {
        newData.JournalEntries = [];
      }
      
      // Ensure JournalLines collection exists
      if (!newData.JournalLines) {
        newData.JournalLines = [];
      }
      
      // Ensure AuditLog collection exists
      if (!newData.AuditLog) {
        newData.AuditLog = [];
      }
      
      // Reconstruct journal entries with lines if needed
      if (newData.JournalEntries && newData.JournalLines) {
        newData.JournalEntries = newData.JournalEntries.map(journal => {
          const lines = newData.JournalLines
            .filter(line => line.journalId === journal.id)
            .sort((a, b) => a.lineNumber - b.lineNumber);
          
          return {
            ...journal,
            lines: lines.map(line => ({
              id: line.id,
              type: line.type,
              program: line.program,
              paymentCenter: line.paymentCenter,
              amount: line.amount
            }))
          };
        });
      }
      
      // Ensure PaymentCenterBudgets collection exists
      if (!newData.PaymentCenterBudgets) {
        newData.PaymentCenterBudgets = [];
      }
      
      // Add other collections if they don't exist
      ['Expenses', 'Suppliers', 'Programs', 'PaymentCenters', 'PaymentTypes', 'PaymentCenterBudgets', 'ExpenseStatus'].forEach(collection => {
        if (!newData[collection]) {
          newData[collection] = [];
        }
      });
      
      setData(newData);
      setInitialized(true);
      
    } catch (err) {
      console.error('Error initializing data:', err);
      setError('Failed to initialize data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [initializePrograms]);
  
  // Load data on component mount 
  useEffect(() => {
    if (!initialized) {
      initializeData();
    }
  }, [initialized, initializeData]);
  
  // Save data to Supabase
  const saveData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        const confirmed = window.confirm('Do you want to save changes to the database?');
        if (!confirmed) return false;
      }
      
      setLoading(true);
      // Implement saving to Supabase here
      // This would involve mapping over data collections and using supabaseService.update/insert
      
      setUnsavedChanges(false);
      return true;
    } catch (err) {
      console.error('Error saving data:', err);
      setError('Failed to save data: ' + (err.message || 'Unknown error'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Add audit entry helper function
  const createAuditEntry = useCallback((entityType, entityId, action, changes, description) => {
    return {
      id: `AUDIT${Date.now()}`,
      entityType,
      entityId,
      action,
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'system',
      timestamp: new Date().toISOString(),
      changes,
      description
    };
  }, [currentUser]);
  
  // Add a new entity to a specific collection
  const addEntity = useCallback(async (collection, entity) => {
    try {
      // Ensure the collection exists
      if (!data[collection]) {
        throw new Error(`Collection "${collection}" does not exist`);
      }
      
      // Generate ID if not provided
      const newEntity = {
        ...entity,
        id: entity.id || uuidv4()
      };
      
      // Check for duplicates
      const existingEntity = data[collection].find(item => item.id === newEntity.id);
      if (existingEntity) {
        console.warn(`Entity with ID ${newEntity.id} already exists in ${collection}`);
        return existingEntity;
      }
      
      // Special handling for Expenses table
      if (collection === 'Expenses') {
        // Add created by and timestamp
        newEntity.createdBy = currentUser?.username || 'system';
        newEntity.createdAt = new Date().toISOString();
        
        // Log the entity before insertion for debugging
        console.log('Adding expense with data:', newEntity);
        
        try {
          // Add to Supabase with field mapping handled in service
          const addedExpense = await supabaseService.insert(collection, newEntity);
          
          // Create audit entry
          const auditEntry = createAuditEntry(
            collection,
            addedExpense.id,
            'CREATE',
            '',
            `Created new expense for ${addedExpense.description || 'unnamed'}`
          );
          
          // Add audit entry
          await supabaseService.insert('AuditLog', auditEntry);
          
          // Add to local data
          if (!data.AuditLog) {
            data.AuditLog = [];
          }
          data.AuditLog.push(auditEntry);
          
          // Update state
          setData(prevData => ({
            ...prevData,
            [collection]: [...prevData[collection], addedExpense]
          }));
          
          setUnsavedChanges(true);
          return addedExpense;
        } catch (error) {
          console.error('Error adding expense:', error);
          // Enhanced error handling for expenses
          let errorMessage = `Failed to add expense: ${error.message}`;
          
          if (error.message.includes('foreign key constraint')) {
            errorMessage = 'One of the selected values (payment center, supplier, etc.) is invalid';
          } else if (error.message.includes('violates not-null constraint')) {
            // Extract the field name from the error message if possible
            const fieldMatch = error.message.match(/column "([^"]+)"/);
            const fieldName = fieldMatch ? fieldMatch[1] : 'a required field';
            errorMessage = `Missing required field: ${fieldName}`;
          }
          
          setError(errorMessage);
          return null;
        }
      }
      
      // Special handling for journal entries with lines
      else if (collection === 'JournalEntries' && entity.lines) {
        // Prepare journal entry for Supabase
        const journalEntry = { ...newEntity };
        delete journalEntry.lines; // Remove lines for main entry
        journalEntry.totalAmount = entity.lines
          .filter(line => line.type === 'debit')
          .reduce((sum, line) => sum + parseFloat(line.amount || 0), 0);
        
        // Add to Supabase
        try {
          const addedJournal = await supabaseService.insert(collection, journalEntry);
          
          // Add lines to JournalLines collection
          for (const [index, line] of entity.lines.entries()) {
            const journalLine = {
              id: `${newEntity.id}-L${index + 1}`,
              journalId: newEntity.id,
              lineNumber: index + 1,
              type: line.type,
              program: line.program || '',
              paymentCenter: line.paymentCenter,
              amount: line.amount,
              createdAt: new Date().toISOString()
            };
            
            await supabaseService.insert('JournalLines', journalLine);
            
            // Add to local data
            if (!data.JournalLines) {
              data.JournalLines = [];
            }
            data.JournalLines.push(journalLine);
          }
          
          // Create audit entry for journal creation
          const auditEntry = createAuditEntry(
            'JournalEntries',
            newEntity.id,
            'CREATE',
            JSON.stringify({ lines: entity.lines.length, totalAmount: journalEntry.totalAmount }),
            `Created journal entry ${newEntity.reference || newEntity.id}`
          );
          
          // Add audit entry
          await supabaseService.insert('AuditLog', auditEntry);
          
          // Add to local data
          if (!data.AuditLog) {
            data.AuditLog = [];
          }
          data.AuditLog.push(auditEntry);
          
          // Update state
          setData(prevData => ({
            ...prevData,
            JournalEntries: [...prevData.JournalEntries, {
              ...addedJournal,
              lines: entity.lines
            }]
          }));
          
          return {
            ...addedJournal,
            lines: entity.lines
          };
        } catch (error) {
          console.error('Error adding journal with lines:', error);
          throw error;
        }
      } else {
        // For other entities
        
        // Convert permissions array to CSV format for Users collection
        if (collection === 'Users' && Array.isArray(newEntity.permissions)) {
          newEntity.permissions = newEntity.permissions.join(',');
        }
        
        // Add to Supabase
        const addedEntity = await supabaseService.insert(collection, newEntity);
        
        // Create audit entry
        const auditEntry = createAuditEntry(
          collection,
          addedEntity.id,
          'CREATE',
          '',
          `Created new ${collection.slice(0, -1)}`
        );
        
        // Add audit entry
        await supabaseService.insert('AuditLog', auditEntry);
        
        // Add to local data
        if (!data.AuditLog) {
          data.AuditLog = [];
        }
        data.AuditLog.push(auditEntry);
        
        // Format for state (convert back permissions for Users)
        const stateEntity = { ...addedEntity };
        if (collection === 'Users' && stateEntity.permissions) {
          stateEntity.permissions = parseCSVPermissions(stateEntity.permissions);
        }
        
        // Update state
        setData(prevData => ({
          ...prevData,
          [collection]: [...prevData[collection], stateEntity]
        }));
        
        setUnsavedChanges(true);
        return stateEntity;
      }
    } catch (err) {
      console.error('Error adding entity:', err);
      
      // Improved error handling
      if (err.code) {
        console.error(`Database error code: ${err.code}`);
      }
      
      if (err.message.includes('not found') || err.message.includes('does not exist')) {
        setError(`Table "${collection}" does not exist or is not accessible`);
      } else if (err.message.includes('violates foreign key constraint')) {
        setError(`One of the reference IDs is invalid or missing`);
      } else if (err.message.includes('violates not-null constraint')) {
        setError(`Missing required field in ${collection}`);
      } else {
        setError(`Failed to add entity to ${collection}: ${err.message}`);
      }
      
      return null;
    }
  }, [data, createAuditEntry, currentUser]);
  
  // Update an entity in a specific collection
  const updateEntity = useCallback(async (collection, id, updates) => {
    try {
      // Ensure the collection exists
      if (!data[collection]) {
        throw new Error(`Collection "${collection}" does not exist`);
      }
      
      // Get existing entity for comparison
      const existingEntity = data[collection].find(item => String(item.id) === String(id));
      if (!existingEntity) {
        throw new Error(`Entity with ID "${id}" not found in ${collection}`);
      }
      
      // Special handling for Expenses table
      if (collection === 'Expenses') {
        try {
          // Update in Supabase with field mapping handled in service
          const updatedExpense = await supabaseService.update(collection, id, updates);
          
          // Create audit entry
          const auditEntry = createAuditEntry(
            collection,
            id,
            'UPDATE',
            JSON.stringify({
              before: { 
                amount: existingEntity.amount,
                status: existingEntity.status
              },
              after: { 
                amount: updates.amount,
                status: updates.status
              }
            }),
            `Updated expense ${existingEntity.description || id}`
          );
          
          // Add audit entry
          await supabaseService.insert('AuditLog', auditEntry);
          
          // Add to local data
          if (!data.AuditLog) {
            data.AuditLog = [];
          }
          data.AuditLog.push(auditEntry);
          
          // Update state
          setData(prevData => ({
            ...prevData,
            [collection]: prevData[collection].map(item => 
              String(item.id) === String(id) ? { ...item, ...updatedExpense } : item
            )
          }));
          
          setUnsavedChanges(true);
          return true;
        } catch (error) {
          console.error('Error updating expense:', error);
          
          // Enhanced error handling for expenses
          let errorMessage = `Failed to update expense: ${error.message}`;
          
          if (error.message.includes('foreign key constraint')) {
            errorMessage = 'One of the selected values (payment center, supplier, etc.) is invalid';
          } else if (error.message.includes('violates not-null constraint')) {
            const fieldMatch = error.message.match(/column "([^"]+)"/);
            const fieldName = fieldMatch ? fieldMatch[1] : 'a required field';
            errorMessage = `Missing required field: ${fieldName}`;
          }
          
          setError(errorMessage);
          return false;
        }
      }
      
      // Special handling for journal entries with lines
      else if (collection === 'JournalEntries' && updates.lines) {
        // Update main journal entry
        const journalUpdates = { ...updates };
        delete journalUpdates.lines;
        journalUpdates.totalAmount = updates.lines
          .filter(line => line.type === 'debit')
          .reduce((sum, line) => sum + parseFloat(line.amount || 0), 0);
        
        // Update in Supabase
        await supabaseService.update(collection, id, journalUpdates);
        
        // Delete existing lines
        if (data.JournalLines) {
          const existingLines = data.JournalLines.filter(line => line.journalId === id);
          for (const line of existingLines) {
            await supabaseService.delete('JournalLines', line.id);
          }
          
          // Update local data
          data.JournalLines = data.JournalLines.filter(line => line.journalId !== id);
        }
        
        // Add updated lines
        for (const [index, line] of updates.lines.entries()) {
          const journalLine = {
            id: `${id}-L${index + 1}`,
            journalId: id,
            lineNumber: index + 1,
            type: line.type,
            program: line.program || '',
            paymentCenter: line.paymentCenter,
            amount: line.amount,
            createdAt: new Date().toISOString()
          };
          
          await supabaseService.insert('JournalLines', journalLine);
          
          // Add to local data
          if (!data.JournalLines) {
            data.JournalLines = [];
          }
          data.JournalLines.push(journalLine);
        }
        
        // Create audit entry for journal update
        const auditEntry = createAuditEntry(
          'JournalEntries',
          id,
          updates.status !== existingEntity.status ? 
            (updates.status === 'Approved' ? 'APPROVE' : 
             updates.status === 'Rejected' ? 'REJECT' : 'UPDATE') 
            : 'UPDATE',
          JSON.stringify({
            oldStatus: existingEntity.status,
            newStatus: updates.status,
            totalAmount: journalUpdates.totalAmount,
            lines: updates.lines.length
          }),
          updates.status !== existingEntity.status ?
            `Status changed from ${existingEntity.status} to ${updates.status}` :
            `Updated journal entry ${existingEntity.reference || id}`
        );
        
        // Add audit entry
        await supabaseService.insert('AuditLog', auditEntry);
        
        // Add to local data
        if (!data.AuditLog) {
          data.AuditLog = [];
        }
        data.AuditLog.push(auditEntry);
        
        // Update state
        setData(prevData => ({
          ...prevData,
          JournalEntries: prevData.JournalEntries.map(journal => 
            String(journal.id) === String(id) ? { 
              ...journal, 
              ...journalUpdates,
              lines: updates.lines
            } : journal
          )
        }));
        
      } else {
        // For other entities
        
        // Convert permissions array to CSV format for Users collection
        const supabaseUpdates = { ...updates };
        if (collection === 'Users' && Array.isArray(supabaseUpdates.permissions)) {
          supabaseUpdates.permissions = supabaseUpdates.permissions.join(',');
        }
        
        // Update in Supabase
        await supabaseService.update(collection, id, supabaseUpdates);
        
        // Create audit entry
        const auditEntry = createAuditEntry(
          collection,
          id,
          'UPDATE',
          JSON.stringify({
            before: existingEntity,
            after: updates
          }),
          `Updated ${collection.slice(0, -1)} ${id}`
        );
        
        // Add audit entry
        await supabaseService.insert('AuditLog', auditEntry);
        
        // Add to local data
        if (!data.AuditLog) {
          data.AuditLog = [];
        }
        data.AuditLog.push(auditEntry);
        
        // Update state (convert back permissions for Users)
        const stateUpdates = { ...updates };
        if (collection === 'Users' && updates.permissions) {
          stateUpdates.permissions = parseCSVPermissions(updates.permissions);
        }
        
        setData(prevData => ({
          ...prevData,
          [collection]: prevData[collection].map(item => 
            String(item.id) === String(id) ? { ...item, ...stateUpdates } : item
          )
        }));
      }
      
      setUnsavedChanges(true);
      return true;
    } catch (err) {
      console.error('Error updating entity:', err);
      
      // Improved error handling
      if (err.code) {
        console.error(`Database error code: ${err.code}`);
      }
      
      if (err.message.includes('not found') || err.message.includes('does not exist')) {
        setError(`Table "${collection}" does not exist or is not accessible`);
      } else if (err.message.includes('violates foreign key constraint')) {
        setError(`One of the reference IDs is invalid or missing`);
      } else if (err.message.includes('violates not-null constraint')) {
        setError(`Missing required field in ${collection}`);
      } else {
        setError(`Failed to update entity in ${collection}: ${err.message}`);
      }
      
      return false;
    }
  }, [data, createAuditEntry]);
  
  // Delete an entity from a specific collection
  const deleteEntity = useCallback(async (collection, id) => {
    try {
      // Ensure the collection exists
      if (!data[collection]) {
        throw new Error(`Collection "${collection}" does not exist`);
      }
      
      // Get existing entity for audit
      const existingEntity = data[collection].find(item => String(item.id) === String(id));
      if (!existingEntity) {
        throw new Error(`Entity with ID "${id}" not found in ${collection}`);
      }
      
      // Special handling for journal entries - also delete lines
      if (collection === 'JournalEntries') {
        // Delete journal lines
        if (data.JournalLines) {
          const journalLines = data.JournalLines.filter(line => line.journalId === id);
          for (const line of journalLines) {
            await supabaseService.delete('JournalLines', line.id);
          }
          
          // Update local data
          data.JournalLines = data.JournalLines.filter(line => line.journalId !== id);
        }
      }
      
      // Delete from Supabase
      await supabaseService.delete(collection, id);
      
      // Create audit entry for deletion
      const auditEntry = createAuditEntry(
        collection,
        id,
        'DELETE',
        JSON.stringify(existingEntity),
        `Deleted ${collection.slice(0, -1)} ${id}`
      );
      
      // Add audit entry
      await supabaseService.insert('AuditLog', auditEntry);
      
      // Add to local data
      if (!data.AuditLog) {
        data.AuditLog = [];
      }
      data.AuditLog.push(auditEntry);
      
      // Update state
      setData(prevData => ({
        ...prevData,
        [collection]: prevData[collection].filter(item => String(item.id) !== String(id))
      }));
      
      setUnsavedChanges(true);
      return true;
    } catch (err) {
      console.error('Error deleting entity:', err);
      setError(`Failed to delete entity from ${collection}: ${err.message}`);
      return false;
    }
  }, [data, createAuditEntry]);
  
  // Export data to Excel file
  const exportToExcel = useCallback((filename = 'KIOSC_Finance_Export.xlsx') => {
    try {
      // This would need to be updated or replaced for a Supabase implementation
      // Since we're moving away from Excel storage
      alert('Excel export is not implemented in the Supabase version.');
      return false;
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setError('Failed to export data to Excel: ' + err.message);
      return false;
    }
  }, []);
  
  // Export data to PDF file
  const exportToPdf = useCallback((type, options = {}) => {
    try {
      let doc;
      
      switch (type) {
        case 'suppliers':
          doc = pdfExporter.exportSuppliersToPdf(
            data.Suppliers || [],
            options.categories || [],
            options.title || 'Supplier List'
          );
          break;
        case 'supplierDetails':
          doc = pdfExporter.exportSupplierDetailsToPdf(
            options.supplier,
            options.categories || [],
            options.transactions || []
          );
          break;
        case 'expenses':
          doc = pdfExporter.exportExpensesToPdf(
            data.Expenses || [],
            data.Suppliers || [],
            data.Programs || [],
            data.PaymentCenters || [],
            options.title || 'Expense Report'
          );
          break;
        case 'journalEntries':
          doc = pdfExporter.exportJournalsToPdf(
            data.JournalEntries || [],
            data.Programs || [],
            data.PaymentCenters || [],
            options.title || 'Journal Entries Report'
          );
          break;
        case 'journalDetails':
          doc = pdfExporter.exportJournalDetailsToPdf(
            options.journal,
            data.Programs || [],
            data.PaymentCenters || []
          );
          break;
        default:
          throw new Error(`Unknown PDF export type: ${type}`);
      }
      
      doc.save(options.filename || `KIOSC_${type}_Export.pdf`);
      return true;
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      setError('Failed to export data to PDF: ' + err.message);
      return false;
    }
  }, [data]);
  
  // Export data to CSV file
  const exportToCsv = useCallback((type, options = {}) => {
    try {
      switch (type) {
        case 'suppliers':
          csvExporter.exportSuppliersToCsv(
            data.Suppliers || [],
            options.categories || [],
            options.filename || 'KIOSC_Suppliers.csv'
          );
          break;
        case 'expenses':
          csvExporter.exportExpensesToCsv(
            data.Expenses || [],
            data.Suppliers || [],
            data.Programs || [],
            data.PaymentCenters || [],
            data.PaymentTypes || [],
            options.filename || 'KIOSC_Expenses.csv'
          );
          break;
        case 'journalEntries':
          csvExporter.exportJournalsToCsv(
            data.JournalEntries || [],
            data.Programs || [],
            data.PaymentCenters || [],
            options.filename || 'KIOSC_JournalEntries.csv'
          );
          break;
        default:
          throw new Error(`Unknown CSV export type: ${type}`);
      }
      return true;
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      setError('Failed to export data to CSV: ' + err.message);
      return false;
    }
  }, [data]);
  
  // Get entities from a specific collection
  const getEntities = useCallback((collection) => {
    return data[collection] || [];
  }, [data]);
  
  // Get a specific entity by ID
  const getEntityById = useCallback((collection, id) => {
    if (!data[collection]) {
      return null;
    }
    
    return data[collection].find(item => String(item.id) === String(id)) || null;
  }, [data]);
  
  // Filter entities by field value
  const filterEntities = useCallback((collection, field, value) => {
    if (!data[collection]) {
      return [];
    }
    
    return data[collection].filter(item => String(item[field]) === String(value));
  }, [data]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Context value
  const contextValue = {
    data,
    setData,
    loading,
    error,
    initialized,
    unsavedChanges,
    initializeData,
    saveData,
    exportToExcel,
    exportToPdf,
    exportToCsv,
    addEntity,
    updateEntity,
    deleteEntity,
    getEntities,
    filterEntities,
    clearError
  };
  
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook for using the data context
export const useData = () => {
  const context = useContext(DataContext);
  
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  
  return context;
};

export default DataContext;