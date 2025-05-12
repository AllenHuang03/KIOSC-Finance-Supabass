// src/components/PaymentCenterBudgetForm.js - Complete Fixed Version
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Button,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useData } from '../contexts/DataContext';
import supabaseService from '../services/SupabaseService';
import excelService from '../services/ExcelService';
import supabase from '../lib/supabase';

const PaymentCenterBudgetForm = ({ open, onClose, onSaveToGitHub }) => {
  // Correctly include initializeData from the DataContext
  const { data, addEntity, updateEntity, getEntities, initializeData, setData } = useData();
  const [budgets, setBudgets] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Create an array of years
  const currentYear = new Date().getFullYear();
  const years = [
    (currentYear - 1).toString(),
    currentYear.toString(),
    (currentYear + 1).toString()
  ];
  
  // Debug data
  console.log("PaymentCenterBudgetForm Data:", {
    paymentCenters: data.PaymentCenters,
    budgets: data.PaymentCenterBudgets
  });
  
  // Initialize budgets for all payment centers
  const initializeBudgets = useCallback(async () => {
    if (data.PaymentCenters) {
      const paymentCenters = data.PaymentCenters || [];
      const budgetEntries = data.PaymentCenterBudgets || [];
      
      console.log("Initializing budgets for year:", selectedYear);
      console.log("Payment Centers:", paymentCenters);
      console.log("All Budget Entries:", budgetEntries);
      
      // Get budgets for the selected year
      // Make sure to convert year to string for consistent comparison
      const yearBudgets = budgetEntries.filter(budget => 
        budget.year.toString() === selectedYear.toString()
      );
      
      console.log("Year Budgets:", yearBudgets);
      
      // Map payment centers with their budgets
      const mappedBudgets = paymentCenters.map(center => {
        // Ensure center.id is a string for comparison
        const centerId = center.id.toString();
        
        // Find existing budget - need to ensure types match for comparison
        const existingBudget = yearBudgets.find(
          budget => budget.paymentCenterId.toString() === centerId
        );
        
        console.log(`Processing center ${center.name} (ID: ${centerId}):`, {
          existingBudget,
          budgetValue: existingBudget ? existingBudget.budget : '0'
        });
        
        return {
          paymentCenterId: centerId,
          paymentCenterName: center.name,
          year: selectedYear,
          budget: existingBudget ? existingBudget.budget : '0',
          id: existingBudget ? existingBudget.id : `budget-${centerId}-${selectedYear}`
        };
      });
      
      console.log("Mapped budgets for UI:", mappedBudgets);
      setBudgets(mappedBudgets);
      setUnsavedChanges(false);
    }
  }, [data.PaymentCenters, data.PaymentCenterBudgets, selectedYear]);
  
  
  // Update budgets when dialog opens or year changes
  useEffect(() => {
    if (open) {
      console.log("Dialog opened or year changed - initializing budgets");
      initializeBudgets();
    }
  }, [open, selectedYear, initializeBudgets]);

  useEffect(() => {
    if (open && data.PaymentCenterBudgets) {
      console.log("PaymentCenterBudgets data changed - refreshing budget form");
      initializeBudgets();
    }
  }, [open, data.PaymentCenterBudgets, initializeBudgets]);
  
  // Handle budget input change
  const handleBudgetChange = (paymentCenterId, value) => {
    console.log(`Changing budget for center ${paymentCenterId} to ${value}`);
    setBudgets(prevBudgets => 
      prevBudgets.map(budget => 
        budget.paymentCenterId === paymentCenterId 
          ? { ...budget, budget: value } 
          : budget
      )
    );
    setUnsavedChanges(true);
  };
  
  // Handle year change
  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };
  
  // Handle save budgets - FIXED VERSION
  const handleSaveBudgets = async () => {
    try {
      setSaving(true);
      console.log("Saving budgets:", budgets);
      
      // Validate budget values
      const invalidBudgets = budgets.filter(
        budget => isNaN(parseFloat(budget.budget)) || parseFloat(budget.budget) < 0
      );
      
      if (invalidBudgets.length > 0) {
        setSnackbar({
          open: true,
          message: 'Invalid budget values. Please enter valid numbers.',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      // Track if any were saved
      let savedCount = 0;
      
      // Save each budget
      for (const budget of budgets) {
        try {
          // Create a standard format budget ID
          const budgetId = `budget-${budget.paymentCenterId}-${selectedYear}`;
          
          // Check if this budget exists in Supabase (direct DB query)
          const { data: existingData, error: queryError } = await supabase
            .from('PaymentCenterBudgets')
            .select('*')
            .eq('id', budgetId)
            .maybeSingle();
          
          if (queryError) {
            console.error("Error checking for existing budget:", queryError);
            continue;
          }
          
          // Prepare the budget data
          const budgetData = {
            id: budgetId,
            paymentCenterId: budget.paymentCenterId,
            year: selectedYear,
            budget: budget.budget,
            updatedAt: new Date().toISOString()
          };
          
          // If budget exists, update it; otherwise create it
          if (existingData) {
            const { data: updateData, error: updateError } = await supabase
              .from('PaymentCenterBudgets')
              .update({ budget: budget.budget, updatedAt: new Date().toISOString() })
              .eq('id', budgetId)
              .select();
            
            if (updateError) {
              console.error(`Error updating budget ${budgetId}:`, updateError);
            } else {
              console.log(`Updated budget ${budgetId}:`, updateData);
              savedCount++;
            }
          } else {
            // Add created timestamp for new budgets
            budgetData.createdAt = new Date().toISOString();
            
            const { data: insertData, error: insertError } = await supabase
              .from('PaymentCenterBudgets')
              .insert(budgetData)
              .select();
            
            if (insertError) {
              console.error(`Error creating budget ${budgetId}:`, insertError);
            } else {
              console.log(`Created budget ${budgetId}:`, insertData);
              savedCount++;
            }
          }
        } catch (error) {
          console.error("Error processing budget:", error);
        }
      }
      
      // Show success message
      setSnackbar({
        open: true,
        message: `${savedCount} budgets saved successfully!`,
        severity: 'success'
      });
  
      setUnsavedChanges(false);
      setEditMode(false);
      
      // Refresh data to get updated budgets
      try {
        // Refresh only PaymentCenterBudgets collection
        const { data: refreshedBudgets, error } = await supabase
          .from('PaymentCenterBudgets')
          .select('*');
        
        if (error) {
          console.error("Error refreshing budgets:", error);
        } else {
          // Update local data context with new budgets
          setData(prevData => ({
            ...prevData,
            PaymentCenterBudgets: refreshedBudgets
          }));
          
          // Re-initialize budgets for the form
          setTimeout(() => {
            initializeBudgets();
          }, 500);
        }
      } catch (refreshError) {
        console.error("Error refreshing data:", refreshError);
      }
    } catch (error) {
      console.error('Error saving budgets:', error);
      setSnackbar({
        open: true,
        message: 'Error saving budgets. Please try again.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  

  // Export database without saving changes - Separated from save function
  const handleExportDatabase = async () => {
    try {
      setExporting(true);
      console.log("Exporting database...");
      
      // Export all data from Supabase
      const allData = await supabaseService.exportAllData();
      
      // Save to Excel file
      const exportSuccess = excelService.saveToFile(
        excelService.saveDataToExcel(allData), 
        'KIOSC_Finance_Data.xlsx'
      );
      
      if (exportSuccess) {
        setSnackbar({
          open: true,
          message: 'Database exported to Excel successfully!',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error("Export error:", err);
      setSnackbar({
        open: true,
        message: 'Error exporting data to Excel',
        severity: 'error'
      });
    } finally {
      setExporting(false);
    }
  };

  // Add reminder at close
  const handleClose = () => {
    if (unsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirm) return;
    }
    onClose();
  };
  
  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Payment Center Budgets
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              onChange={handleYearChange}
              label="Year"
              disabled={editMode}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant={editMode ? "contained" : "outlined"}
            startIcon={editMode ? <SaveIcon /> : <EditIcon />}
            onClick={editMode ? handleSaveBudgets : () => setEditMode(true)}
            color={editMode ? "success" : "primary"}
            disabled={saving || exporting}
          >
            {editMode ? (saving ? "Saving..." : "Save Budgets") : "Edit Budgets"}
            {saving && <CircularProgress size={20} sx={{ ml: 1 }} />}
          </Button>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Set budgets for each payment center for the selected year. These budgets will be used for reporting and visualizations.
        </Alert>

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportDatabase}
            disabled={saving || exporting}
          >
            {exporting ? "Exporting..." : "Export Database"}
            {exporting && <CircularProgress size={20} sx={{ ml: 1 }} />}
          </Button>
        </Box>
        
        {budgets.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No payment centers found. Please add payment centers first.
          </Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="60%">Payment Center</TableCell>
                <TableCell width="40%">Budget (AUD)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.paymentCenterId}>
                  <TableCell>{budget.paymentCenterName}</TableCell>
                  <TableCell>
                    {editMode ? (
                      <TextField
                        type="number"
                        size="small"
                        value={budget.budget}
                        onChange={(e) => handleBudgetChange(budget.paymentCenterId, e.target.value)}
                        fullWidth
                        inputProps={{ min: 0, step: 100 }}
                      />
                    ) : (
                      formatCurrency(parseFloat(budget.budget) || 0)
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Total row */}
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(
                    budgets.reduce((sum, budget) => sum + (parseFloat(budget.budget) || 0), 0)
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </DialogContent>
      
      <DialogActions>
        {editMode && (
          <Button onClick={() => setEditMode(false)} color="inherit">
            Cancel
          </Button>
        )}
        <Button onClick={handleClose} color="primary">
          Close
        </Button>
      </DialogActions>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default PaymentCenterBudgetForm;