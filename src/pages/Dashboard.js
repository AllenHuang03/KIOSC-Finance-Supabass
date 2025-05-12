// src/pages/Dashboard.js - Complete version with budget fix
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button,
  Card,
  CardContent, 
  CardHeader,
  Divider, 
  List, 
  ListItem, 
  ListItemText,
  CircularProgress,
  Chip,
  IconButton,
  Alert,
  Tooltip,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Add as AddIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  MonetizationOn as MoneyIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  BarChart as ChartIcon,
  PieChart as PieChartIcon,
  DateRange as DateRangeIcon,
  Book as JournalIcon,
  Close as CloseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { useData } from '../contexts/DataContext';
import { format, parseISO, subMonths } from 'date-fns';
import PaymentCenterBudgetForm from '../components/PaymentCenterBudgetForm';


// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  ChartTooltip,
  Legend
);

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Dashboard period options
const periods = [
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, loading, error, initializeData } = useData();
  
  // Dashboard state
  const [period, setPeriod] = useState('year');
  const [tabValue, setTabValue] = useState(0);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedDrillDown, setSelectedDrillDown] = useState(null);
  const [drillDownExpenses, setDrillDownExpenses] = useState([]);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  
  // Debug logging
  useEffect(() => {
    if (data && data.PaymentCenterBudgets) {
      console.log("Available budget data:", data.PaymentCenterBudgets);
    }
  }, [data]);

  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (data.PaymentCenterBudgets && data.PaymentCenterBudgets.length > 0) {
      console.log("BUDGET DATA CHECK in Dashboard:");
      console.log(data.PaymentCenterBudgets);
      
      // Force UI update when budget data changes
      setLastUpdate(new Date());
    }
  }, [data.PaymentCenterBudgets]);

// Force alert recalculation after data load
useEffect(() => {
  if (!loading && data && Object.keys(data).length > 0) {
    // Force a re-render after data is loaded in production
    setTimeout(() => {
      console.log("Forcing alert recalculation");
      setLastUpdate(new Date());
    }, 500);
  }
}, [loading, data]);
  
  // Refresh data
  const handleRefresh = () => {
    initializeData();
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };
  
  // Handle period change
  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };
  
  // Get start date based on selected period
  const getStartDate = () => {
    const now = new Date();
    
    switch (period) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case '3months':
        return subMonths(now, 3);
      case '6months':
        return subMonths(now, 6);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      case 'all':
      default:
        return new Date(2000, 0, 1); // Arbitrary old date
    }
  };
  
  // Filter expenses by date
  const filteredExpenses = useMemo(() => {
    if (!data.Expenses) return [];
    
    const startDate = getStartDate();
    
    return data.Expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate;
    });
  }, [data.Expenses, period]);
  
  // Filter journal entries by date
  const filteredJournals = useMemo(() => {
    if (!data.JournalEntries) return [];
    
    const startDate = getStartDate();
    
    return data.JournalEntries.filter(journal => {
      if (journal.id === 'dummy-journal') return false;
      
      const journalDate = new Date(journal.date);
      return journalDate >= startDate;
    });
  }, [data.JournalEntries, period]);
  
  // Calculate totals by payment center with budget comparison
  const paymentCenterTotals = useMemo(() => {
    if (!data.PaymentCenters) return [];
    
    const centers = {};
    const currentYear = new Date().getFullYear().toString();
    
    // Debug log the available budget data
    console.log("Available PaymentCenterBudgets:", data.PaymentCenterBudgets);
    
    // Initialize centers
    data.PaymentCenters.forEach(center => {
      // Convert center.id to string for consistent comparison
      const centerId = center.id.toString();
      
      // Find budget for this payment center for current year
      // Make sure to convert paymentCenterId to string for comparison
      const centerBudget = data.PaymentCenterBudgets?.find(
        budget => budget.paymentCenterId.toString() === centerId && 
                  budget.year.toString() === currentYear
      );
      
      // Debug log for each center's budget
      console.log(`Budget for ${center.name} (ID: ${centerId}):`, centerBudget);
      
      centers[centerId] = {
        id: centerId,
        name: center.name,
        total: 0,
        budget: centerBudget ? parseFloat(centerBudget.budget) : 0,
        expenses: []
      };
    });
    
    // Sum expenses by payment center
    if (filteredExpenses.length) {
      filteredExpenses.forEach(expense => {
        // Convert expense.paymentCenter to string for consistent lookup
        const expenseCenterId = expense.paymentCenter.toString();
        
        if (centers[expenseCenterId]) {
          centers[expenseCenterId].total += parseFloat(expense.amount) || 0;
          centers[expenseCenterId].expenses.push(expense);
        }
      });
    }
    
    return Object.values(centers);
  }, [data.PaymentCenters, data.PaymentCenterBudgets, filteredExpenses]);
  
  // Calculate total budget utilization
  const budgetUtilization = useMemo(() => {
    const totalBudget = paymentCenterTotals.reduce((sum, center) => sum + center.budget, 0);
    const totalSpent = paymentCenterTotals.reduce((sum, center) => sum + center.total, 0);
    
    return totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  }, [paymentCenterTotals]);
  
  // Calculate totals by payment type
  const paymentTypeTotals = useMemo(() => {
    if (!data.PaymentTypes || !filteredExpenses.length) return [];
    
    const types = {};
    
    // Initialize types
    data.PaymentTypes.forEach(type => {
      types[type.id] = {
        id: type.id,
        name: type.name,
        total: 0,
        expenses: []
      };
    });
    
    // Sum expenses by payment type
    filteredExpenses.forEach(expense => {
      if (types[expense.paymentType]) {
        types[expense.paymentType].total += parseFloat(expense.amount) || 0;
        types[expense.paymentType].expenses.push(expense);
      }
    });
    
    return Object.values(types);
  }, [data.PaymentTypes, filteredExpenses]);
  
  // Calculate expense status counts
const expenseStatusCounts = useMemo(() => {
  // Always return the default object with zeros
  const counts = {
    Committed: 0,
    Invoiced: 0,
    Paid: 0
  };
  
  if (filteredExpenses && filteredExpenses.length) {
    filteredExpenses.forEach(expense => {
      if (expense.status && counts[expense.status] !== undefined) {
        counts[expense.status]++;
      }
    });
  }
  
  return counts;
}, [filteredExpenses]);

// Calculate expense status amounts
const expenseStatusAmounts = useMemo(() => {
  // Always return the default object with zeros
  const amounts = {
    Committed: 0,
    Invoiced: 0,
    Paid: 0
  };
  
  if (filteredExpenses && filteredExpenses.length) {
    filteredExpenses.forEach(expense => {
      if (expense.status && amounts[expense.status] !== undefined) {
        amounts[expense.status] += parseFloat(expense.amount) || 0;
      }
    });
  }
  
  return amounts;
}, [filteredExpenses]);
  
  // Calculate journal status counts
  const journalStatusCounts = useMemo(() => {
    if (!filteredJournals.length) return {};
    
    const counts = {
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Cancelled: 0
    };
    
    filteredJournals.forEach(journal => {
      if (counts[journal.status] !== undefined) {
        counts[journal.status]++;
      }
    });
    
    return counts;
  }, [filteredJournals]);
  
  // Calculate alerts and warnings
const dashboardAlerts = useMemo(() => {
  const alerts = [];

  console.log("Alert calculation starting with data:", {
    paymentCenters: paymentCenterTotals,
    journalStatuses: journalStatusCounts,
    expenseStatuses: expenseStatusCounts,
    dataLoaded: !!data && Object.keys(data).length > 0,
    timestamp: lastUpdate  // Include the timestamp to force re-evaluation
  });
  
  // Check for payment centers over budget
  const overBudgetCenters = paymentCenterTotals.filter(center => 
    center.budget > 0 && center.total > center.budget
  );
  
  overBudgetCenters.forEach(center => {
    const overBudgetPercent = ((center.total - center.budget) / center.budget * 100).toFixed(1);
    alerts.push({
      type: 'error',
      message: `${center.name} is over budget by ${overBudgetPercent}% (${formatCurrency(center.total - center.budget)})`
    });
  });
  
  // Check for payment centers near budget limit (>80%)
  const nearBudgetCenters = paymentCenterTotals.filter(center => 
    center.budget > 0 && 
    center.total <= center.budget && 
    center.total >= (center.budget * 0.8)
  );
  
  nearBudgetCenters.forEach(center => {
    const usedPercent = ((center.total / center.budget) * 100).toFixed(1);
    alerts.push({
      type: 'warning',
      message: `${center.name} is at ${usedPercent}% of budget`
    });
  });
  
  // Check for pending journals
  if (journalStatusCounts.Pending && journalStatusCounts.Pending > 0) {
    alerts.push({
      type: 'warning',
      message: `${journalStatusCounts.Pending} journal ${journalStatusCounts.Pending === 1 ? 'entry' : 'entries'} pending approval`
    });
  }
  
  // Check for uncommitted expenses
  if (expenseStatusCounts.Committed && expenseStatusCounts.Committed > 0) {
    alerts.push({
      type: 'info',
      message: `${expenseStatusCounts.Committed} ${expenseStatusCounts.Committed === 1 ? 'expense' : 'expenses'} awaiting processing (${formatCurrency(expenseStatusAmounts.Committed)})`
    });
  }
  console.log("Final alerts:", alerts);
  
  return alerts;
}, [paymentCenterTotals, journalStatusCounts, expenseStatusCounts, expenseStatusAmounts, formatCurrency, data, lastUpdate]);
  
  // Budget vs Actual chart data by payment center
  const paymentCenterChartData = useMemo(() => {
    return {
      labels: paymentCenterTotals.map(center => center.name),
      datasets: [
        {
          label: 'Actual Expenses',
          data: paymentCenterTotals.map(center => center.total),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Budget',
          data: paymentCenterTotals.map(center => center.budget),
          backgroundColor: 'rgba(255, 206, 86, 0.6)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        }
      ]
    };
  }, [paymentCenterTotals]);
  
  // Payment type pie chart data
  const paymentTypePieData = useMemo(() => {
    return {
      labels: paymentTypeTotals.map(type => type.name),
      datasets: [
        {
          data: paymentTypeTotals.map(type => type.total),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }, [paymentTypeTotals]);
  
  // Expense status pie chart data
  const expenseStatusPieData = useMemo(() => {
    return {
      labels: Object.keys(expenseStatusAmounts),
      datasets: [
        {
          data: Object.values(expenseStatusAmounts),
          backgroundColor: [
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
          ],
          borderColor: [
            'rgba(255, 159, 64, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }, [expenseStatusAmounts]);

// Monthly expenses line chart data
const monthlyExpenseData = useMemo(() => {
  if (!data.Expenses) return { labels: [], datasets: [] };
  
  // Group expenses by month
  const monthlyData = {};
  const now = new Date();
  let startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1); // Last 6 months
  
  if (period === 'year') {
    startMonth = new Date(now.getFullYear(), 0, 1); // Start of the year
  } else if (period === 'all') {
    // Find the earliest expense date
    const dates = data.Expenses.map(e => new Date(e.date));
    if (dates.length > 0) {
      startMonth = new Date(Math.min(...dates));
      startMonth.setDate(1);
    }
  }
  
  // Initialize all months with zero
  let currentMonth = new Date(startMonth);
  while (currentMonth <= now) {
    const monthKey = format(currentMonth, 'yyyy-MM');
    monthlyData[monthKey] = { total: 0, count: 0 };
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }
  
  // Fill in actual expense data
  data.Expenses.forEach(expense => {
    if (!expense.date) return;
    
    const expenseDate = new Date(expense.date);
    if (expenseDate >= startMonth) {
      const monthKey = format(expenseDate, 'yyyy-MM');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total += parseFloat(expense.amount) || 0;
        monthlyData[monthKey].count += 1;
      }
    }
  });
  
  // Convert to arrays for chart
  const labels = Object.keys(monthlyData).map(key => {
    const [year, month] = key.split('-');
    return `${month}/${year}`;
  });
  
  const amounts = Object.values(monthlyData).map(data => data.total);
  const counts = Object.values(monthlyData).map(data => data.count);
  
  return {
    labels,
    datasets: [
      {
        label: 'Total Amount',
        data: amounts,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        yAxisID: 'y',
        tension: 0.1
      },
      {
        label: 'Number of Expenses',
        data: counts,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
        tension: 0.1
      }
    ]
  };
}, [data.Expenses, period]);

// Handle drill-down click on payment center
const handlePaymentCenterClick = (event, elements) => {
  if (elements.length > 0) {
    const index = elements[0].index;
    const center = paymentCenterTotals[index];
    setSelectedDrillDown(`${center.name} Expenses`);
    setDrillDownExpenses(center.expenses);
    setDrillDownOpen(true);
  }
};

// Handle drill-down click on payment type
const handlePaymentTypeClick = (event, elements) => {
  if (elements.length > 0) {
    const index = elements[0].index;
    const type = paymentTypeTotals[index];
    setSelectedDrillDown(`${type.name} Expenses`);
    setDrillDownExpenses(type.expenses);
    setDrillDownOpen(true);
  }
};

// Handle status pie click
const handleStatusClick = (event, elements) => {
  if (elements.length > 0) {
    const index = elements[0].index;
    const status = Object.keys(expenseStatusAmounts)[index];
    const statusExpenses = filteredExpenses.filter(expense => expense.status === status);
    setSelectedDrillDown(`${status} Expenses`);
    setDrillDownExpenses(statusExpenses);
    setDrillDownOpen(true);
  }
};

// Close drill-down dialog
const handleCloseDrillDown = () => {
  setDrillDownOpen(false);
  setSelectedDrillDown(null);
  setDrillDownExpenses([]);
};

// Open budget management dialog
const handleOpenBudgetDialog = () => {
  // Force refresh data before opening dialog
  initializeData();
  setBudgetDialogOpen(true);
};

// Close budget management dialog
const handleCloseBudgetDialog = () => {
  setBudgetDialogOpen(false);
  // Wait a moment and refresh data to show updated budgets
  setTimeout(() => {
    initializeData();
  }, 500);
};

// Handle GitHub save for budgets
const handleSaveToGitHub = () => {
  alert("GitHub save functionality would be implemented here. This is a placeholder.");
  // Additional GitHub save logic would go here
};

// Get supplier name by ID
const getSupplierName = (id) => {
  const supplier = data.Suppliers?.find(s => s.id === id);
  return supplier ? supplier.name : 'Unknown';
};

// Get payment center name by ID
const getPaymentCenterName = (id) => {
  const center = data.PaymentCenters?.find(c => c.id === id);
  return center ? center.name : 'Unknown';
};

// Get payment type name by ID
const getPaymentTypeName = (id) => {
  const type = data.PaymentTypes?.find(t => t.id === id);
  return type ? type.name : 'Unknown';
};

// If loading
if (loading) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress />
    </Box>
  );
}

// If error
if (error) {
  return (
    <Alert severity="error" sx={{ mt: 2 }}>
      {typeof error === 'string' ? error : 'An error occurred'}
    </Alert>
  );
}

return (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4">Financial Dashboard</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150, mr: 2 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={period}
            onChange={handlePeriodChange}
            label="Time Period"
          >
            {periods.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={handleOpenBudgetDialog}
          sx={{ mr: 1 }}
        >
          Manage Budgets
        </Button>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ mr: 1 }}
        >
          Refresh
        </Button>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/expenses?action=new')}
        >
          New Expense
        </Button>
      </Box>
    </Box>

    {/* Summary Cards */}
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Expenses
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: 'primary.light', 
                  color: 'primary.dark',
                  mr: 2
                }}
              >
                <MoneyIcon />
              </Box>
              <Box>
                <Typography variant="h4" component="div">
                  {formatCurrency(filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0))}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {filteredExpenses.length} expense records
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Budget Utilization
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: budgetUtilization > 100 ? 'error.light' : budgetUtilization > 80 ? 'warning.light' : 'success.light', 
                  color: budgetUtilization > 100 ? 'error.dark' : budgetUtilization > 80 ? 'warning.dark' : 'success.dark',
                  mr: 2
                }}
              >
                <AccountBalanceIcon />
              </Box>
              <Box>
                <Typography variant="h4" component="div">
                  {budgetUtilization.toFixed(1)}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Typography 
                    variant="body2" 
                    color={budgetUtilization > 100 ? 'error.main' : budgetUtilization > 80 ? 'warning.main' : 'success.main'}
                  >
                    {budgetUtilization > 100 ? 'Over budget' : 
                    budgetUtilization > 80 ? 'Near budget limit' : 
                    'Within budget'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Pending Approval
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: 'warning.light', 
                  color: 'warning.dark',
                  mr: 2
                }}
              >
                <WarningIcon />
              </Box>
              <Box>
                <Typography variant="h4" component="div">
                  {formatCurrency(
                    filteredExpenses
                      .filter(e => e.status === 'Committed')
                      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
                  )}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {expenseStatusCounts.Committed || 0} committed expenses
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6} lg={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Journal Entries
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: 'info.light', 
                  color: 'info.dark',
                  mr: 2
                }}
              >
                <JournalIcon />
              </Box>
              <Box>
                <Typography variant="h4" component="div">
                  {filteredJournals.length}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {journalStatusCounts.Pending || 0} pending
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ ml: 1 }}>
                    {journalStatusCounts.Approved || 0} approved
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    {/* Charts Tabs */}
    <Paper sx={{ mb: 3 }}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Tab 
          icon={<ChartIcon />} 
          iconPosition="start"
          label="Budget vs Actual" 
        />
        <Tab 
          icon={<PieChartIcon />} 
          iconPosition="start"
          label="Payment Types" 
        />
        <Tab 
          icon={<PieChartIcon />} 
          iconPosition="start"
          label="Expense Status" 
        />
        <Tab 
          icon={<DateRangeIcon />} 
          iconPosition="start"
          label="Monthly Trend" 
        />
      </Tabs>

      {/* Payment Centers Budget vs Actual Bar Chart */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Budget vs Actual by Payment Center
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Click on a bar to see detailed expenses
          </Typography>
          <Box sx={{ height: 400 }}>
            <Bar 
              data={paymentCenterChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: handlePaymentCenterClick,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Amount (AUD)'
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.parsed.y !== null) {
                          label += formatCurrency(context.parsed.y);
                        }
                        return label;
                      }
                    }
                  }
                }
              }}
            />
          </Box>
          
          {/* Budget details table */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Center Budget Details
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payment Center</TableCell>
                    <TableCell align="right">Budget</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                    <TableCell align="right">Utilization</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentCenterTotals.map((center) => {
                    const remaining = center.budget - center.total;
                    const utilization = center.budget > 0 ? (center.total / center.budget) * 100 : 0;
                    
                    return (
                      <TableRow key={center.id}>
                        <TableCell>{center.name}</TableCell>
                        <TableCell align="right">{formatCurrency(center.budget)}</TableCell>
                        <TableCell align="right">{formatCurrency(center.total)}</TableCell>
                        <TableCell align="right" sx={{ color: remaining < 0 ? 'error.main' : 'success.main' }}>
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${utilization.toFixed(1)}%`}
                            size="small"
                            color={utilization > 100 ? 'error' : utilization > 80 ? 'warning' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ fontWeight: 'bold' }}>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">
                      {formatCurrency(paymentCenterTotals.reduce((sum, c) => sum + c.budget, 0))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(paymentCenterTotals.reduce((sum, c) => sum + c.total, 0))}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(paymentCenterTotals.reduce((sum, c) => sum + (c.budget - c.total), 0))}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${budgetUtilization.toFixed(1)}%`}
                        size="small"
                        color={budgetUtilization > 100 ? 'error' : budgetUtilization > 80 ? 'warning' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </TabPanel>
         {/* Payment Types Pie Chart */}
         <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Expenses by Payment Type
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Click on a slice to see detailed expenses
          </Typography>
          <Box sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Pie 
              data={paymentTypePieData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: handlePaymentTypeClick,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round(value / total * 100);
                        return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      </TabPanel>

      {/* Expense Status Pie Chart */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Expense Status Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Click on a slice to see detailed expenses
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Box sx={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Pie 
                  data={expenseStatusPieData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: handleStatusClick,
                    plugins: {
                      legend: {
                        position: 'right',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round(value / total * 100);
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={7}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(expenseStatusCounts).map(([status, count]) => {
                      const amount = expenseStatusAmounts[status] || 0;
                      const total = Object.values(expenseStatusAmounts).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (amount / total * 100).toFixed(1) : '0.0';
                      
                      return (
                        <TableRow key={status}>
                          <TableCell>
                            <Chip 
                              label={status} 
                              size="small" 
                              color={
                                status === 'Paid' ? 'success' : 
                                status === 'Invoiced' ? 'warning' : 
                                'default'
                              } 
                            />
                          </TableCell>
                          <TableCell align="right">{count}</TableCell>
                          <TableCell align="right">{formatCurrency(amount)}</TableCell>
                          <TableCell align="right">{percentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {Object.values(expenseStatusCounts).reduce((a, b) => a + b, 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(Object.values(expenseStatusAmounts).reduce((a, b) => a + b, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Box>
      </TabPanel>

      {/* Monthly Trend Chart */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Monthly Expense Trend
          </Typography>
          <Box sx={{ height: 400 }}>
            <Line 
              data={monthlyExpenseData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Amount (AUD)'
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                    title: {
                      display: true,
                      text: 'Number of Expenses'
                    }
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.dataset.label === 'Total Amount') {
                          label += formatCurrency(context.parsed.y);
                        } else {
                          label += context.parsed.y;
                        }
                        return label;
                      }
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      </TabPanel>
    </Paper>

    {/* Drill-down Dialog */}
    <Dialog
      open={drillDownOpen}
      onClose={handleCloseDrillDown}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        {selectedDrillDown}
        <IconButton
          aria-label="close"
          onClick={handleCloseDrillDown}
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
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Payment Center</TableCell>
                <TableCell>Payment Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drillDownExpenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{getSupplierName(expense.supplier)}</TableCell>
                  <TableCell>{getPaymentCenterName(expense.paymentCenter)}</TableCell>
                  <TableCell>{getPaymentTypeName(expense.paymentType)}</TableCell>
                  <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={expense.status}
                      size="small"
                      color={
                        expense.status === 'Paid' ? 'success' :
                        expense.status === 'Invoiced' ? 'warning' :
                        'default'
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button 
          variant="outlined" 
          onClick={() => {
            handleCloseDrillDown();
            navigate('/expenses');
          }}
        >
          View All Expenses
        </Button>
        <Button onClick={handleCloseDrillDown} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>

    {/* Recent Activity */}
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Recent Activity</Typography>
        <Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/expenses')}
            sx={{ mr: 1 }}
          >
            View All Expenses
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/journal')}
          >
            View All Journals
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Latest Expenses
          </Typography>
          {filteredExpenses.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExpenses
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5)
                    .map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.date}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={expense.status}
                            size="small"
                            color={
                              expense.status === 'Paid' ? 'success' :
                              expense.status === 'Invoiced' ? 'warning' :
                              'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No expenses found in the selected period.</Alert>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Latest Journal Entries
          </Typography>
          {filteredJournals.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredJournals
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5)
                    .map((journal) => (
                      <TableRow key={journal.id}>
                        <TableCell>{journal.date}</TableCell>
                        <TableCell>{journal.description}</TableCell>
                          <TableCell align="right">{formatCurrency(journal.amount)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={journal.status}
                              size="small"
                              color={
                                journal.status === 'Approved' ? 'success' :
                                journal.status === 'Pending' ? 'warning' :
                                journal.status === 'Rejected' ? 'error' :
                                'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No journal entries found in the selected period.</Alert>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Alerts */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          <Typography variant="h6">Alerts & Notifications</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List>
            {dashboardAlerts.length > 0 ? (
              dashboardAlerts.map((alert, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {alert.type === 'error' && <ArrowUpIcon color="error" sx={{ mr: 1 }} />}
                        {alert.type === 'warning' && <WarningIcon color="warning" sx={{ mr: 1 }} />}
                        {alert.type === 'info' && <InfoIcon color="info" sx={{ mr: 1 }} />}
                        {alert.type === 'success' && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
                        <Typography color={`${alert.type}.main`}>{alert.message}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      <Typography color="success.main">All Clear</Typography>
                    </Box>
                  }
                  secondary="No pending issues or alerts at this time"
                />
              </ListItem>
            )}
          </List>
        )}
      </Paper>

      {/* Budget Management Dialog */}
      <PaymentCenterBudgetForm 
        open={budgetDialogOpen} 
        onClose={handleCloseBudgetDialog}
        onSaveToGitHub={handleSaveToGitHub}
      />
    </Box>
  );
};

export default Dashboard;