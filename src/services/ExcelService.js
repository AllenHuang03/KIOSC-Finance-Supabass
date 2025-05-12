// src/services/ExcelService.js - Simplified for Supabase
import * as XLSX from 'xlsx';

class ExcelService {
  constructor() {
    this.data = null;
    this.workbook = null;
    this.filename = null;
  }

  /**
   * Initialize service with required sheets
   */
  initializeSheets() {
    if (!this.data) {
      this.data = {};
    }
    
    // List of required sheets
    const requiredSheets = [
      'Users',
      'Suppliers',
      'PaymentCenters',
      'PaymentCenterBudgets',
      'PaymentTypes',
      'ExpenseStatus',
      'Expenses',
      'JournalEntries',
      'JournalLines',
      'AuditLog'
    ];
    
    // Initialize any missing sheets
    requiredSheets.forEach(sheet => {
      if (!this.data[sheet]) {
        this.data[sheet] = [];
      }
    });
    
    return this.data;
  }

  /**
   * Load Excel data from an array buffer or file
   * @param {ArrayBuffer|File} excelData - The Excel data to load
   * @param {string} filename - Optional filename
   * @returns {Object} - Object with sheets as keys and arrays of objects as values
   */
  loadExcel(excelData, filename = null) {
    try {
      let workbook;

      if (excelData instanceof File) {
        // Read the file using file reader
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              workbook = XLSX.read(data, { type: 'array', cellDates: true });
              this.workbook = workbook;
              this.filename = filename || excelData.name;
              
              const result = this.parseWorkbook(workbook);
              this.data = result;
              resolve(result);
            } catch (error) {
              reject(error);
            }
          };
          
          reader.onerror = (error) => reject(error);
          reader.readAsArrayBuffer(excelData);
        });
      } else {
        // Assume ArrayBuffer or similar
        workbook = XLSX.read(excelData, { type: 'array', cellDates: true });
        this.workbook = workbook;
        this.filename = filename;
        
        const result = this.parseWorkbook(workbook);
        this.data = result;
        return result;
      }
    } catch (error) {
      console.error('Error loading Excel data:', error);
      throw error;
    }
  }

  /**
   * Parse workbook into structured data
   * @param {Object} workbook - XLSX workbook
   * @returns {Object} - Object with sheets as keys and arrays of objects as values
   */
  parseWorkbook(workbook) {
    const result = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false, // Convert to formatted string
        dateNF: 'yyyy-mm-dd', // Date format
        defval: '' // Default value for empty cells
      });
      
      result[sheetName] = jsonData;
    });
    
    return result;
  }

  /**
   * Convert data to an Excel file
   * @param {Object} data - The data to save (optional, uses internal data if not provided)
   * @returns {ArrayBuffer} - Excel file as array buffer
   */
  saveDataToExcel(data = null) {
    const dataToSave = data || this.data;
    
    if (!dataToSave) {
      throw new Error('No data to save. Load or create data first.');
    }
    
    const workbook = XLSX.utils.book_new();
    
    // Add each data collection as a sheet
    Object.entries(dataToSave).forEach(([sheetName, collection]) => {
      if (Array.isArray(collection) && collection.length > 0) {
        const ws = XLSX.utils.json_to_sheet(collection);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      }
    });
    
    // Save to array buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return buffer;
  }

  /**
   * Save current data to an Excel file
   * @returns {ArrayBuffer} - Excel file as array buffer
   */
  saveToExcel() {
    return this.saveDataToExcel(this.data);
  }

  /**
   * Save array buffer to file
   * @param {ArrayBuffer} buffer - Excel file as array buffer
   * @param {string} filename - The filename to save as
   * @returns {boolean} - Whether the save was successful
   */
  saveToFile(buffer, filename) {
    try {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || this.filename || 'export.xlsx';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      return true;
    } catch (error) {
      console.error('Error saving Excel file:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const excelService = new ExcelService();
export default excelService;