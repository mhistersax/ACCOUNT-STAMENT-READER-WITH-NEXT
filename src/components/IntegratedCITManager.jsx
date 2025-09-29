'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { useApp } from "../contexts/AppContext";
import VirtualizedTransactionList from "./VirtualizedTransactionList";
import ExcelJS from "exceljs";
import { CIT_CATEGORY_MAPPINGS, CIT_MANUAL_TRANSACTIONS } from "../lib/storageKeys";

const IntegratedCITManager = ({ accounts }) => {
  const { customCategories, addCustomCategory } = useApp();
  const [categoryMappings, setCategoryMappings] = useState({});
  const [manuallySetTransactions, setManuallySetTransactions] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [companyDetails, setCompanyDetails] = useState({
    companyName: "",
    tinNumber: "",
    rcNumber: "",
    address: "",
    businessNature: "",
    accountingPeriod: "December",
  });
  const [additionalInfo, setAdditionalInfo] = useState({
    openingAssets: 0,
    openingLiabilities: 0,
    capitalContributions: 0,
    drawings: 0,
  });
  const [activeTab, setActiveTab] = useState("split-view");
  const [previousTab, setPreviousTab] = useState(null);
  const [tabHistory, setTabHistory] = useState(["split-view"]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [lastCategorizedTransaction, setLastCategorizedTransaction] = useState(null);
  const [highlightedTransaction, setHighlightedTransaction] = useState(null);
  const virtualizerRef = useRef(null);

  const defaultCategories = [
    { id: "sales", name: "Sales Revenue", type: "income" },
    { id: "service-income", name: "Service Income", type: "income" },
    { id: "rental-income", name: "Rental Income", type: "income" },
    { id: "interest-income", name: "Interest Income", type: "income" },
    { id: "dividend-income", name: "Dividend Income", type: "income" },
    { id: "other-income", name: "Other Income", type: "income" },
    { id: "office-supplies", name: "Office Supplies", type: "expense" },
    { id: "utilities", name: "Utilities", type: "expense" },
    { id: "rent", name: "Rent/Lease", type: "expense" },
    { id: "marketing", name: "Marketing", type: "expense" },
    { id: "transport", name: "Transportation", type: "expense" },
    { id: "professional-services", name: "Professional Services", type: "expense" },
    { id: "inventory", name: "Inventory/Stock", type: "expense" },
    { id: "insurance", name: "Insurance", type: "expense" },
    { id: "repairs", name: "Repairs & Maintenance", type: "expense" },
    { id: "depreciation", name: "Depreciation", type: "expense" },
    { id: "equipment", name: "Equipment Purchase", type: "expense" },
    { id: "bank-charges", name: "Bank Charges", type: "expense" },
    { id: "loan-payment", name: "Loan Payments", type: "expense" },
    { id: "salaries", name: "Salaries & Wages", type: "expense" },
    { id: "tax-payments", name: "Tax Payments", type: "expense" },
    { id: "airtime", name: "Airtime & Data", type: "expense" },
    { id: "transfer", name: "Internal Transfer", type: "both" },
    { id: "miscellaneous", name: "Miscellaneous", type: "both" }
  ];

  const allCategories = useMemo(() => [
    ...defaultCategories,
    ...customCategories
  ], [customCategories]);

  const allTransactions = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return [];
    }
    return accounts.flatMap(account => account.transactions || []);
  }, [accounts]);

  // Load saved categorizations from localStorage
  useEffect(() => {
    try {
      const savedMappings = localStorage.getItem(CIT_CATEGORY_MAPPINGS);
      const savedManualTransactions = localStorage.getItem(CIT_MANUAL_TRANSACTIONS);
      
      if (savedMappings) {
        const mappings = JSON.parse(savedMappings);
        setCategoryMappings(mappings);
        console.log("Loaded saved categorizations:", mappings);
      }
      
      if (savedManualTransactions) {
        const manualSet = new Set(JSON.parse(savedManualTransactions));
        setManuallySetTransactions(manualSet);
        console.log("Loaded saved manual transactions:", manualSet);
      }
    } catch (error) {
      console.error("Error loading saved categorizations:", error);
    }
  }, []); // Only run once on component mount

  // Keyboard shortcuts for navigation (Alt+Left Arrow for tabs, Alt+Shift+Left Arrow for transactions)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        
        if (event.shiftKey && lastCategorizedTransaction && activeTab === 'categorize') {
          // Alt+Shift+Left Arrow: Go back to last transaction
          handleGoBackToLastTransaction();
        } else if (previousTab) {
          // Alt+Left Arrow: Go back to previous tab
          handleGoBack();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previousTab, lastCategorizedTransaction, activeTab]);

  const generateCITSchedules = useMemo(() => {
    console.log("generateCITSchedules - Starting calculation");
    console.log("- accounts:", accounts);
    console.log("- accounts.length:", accounts?.length);
    console.log("- categoryMappings:", categoryMappings);
    
    if (!accounts || accounts.length === 0) {
      console.log("generateCITSchedules - No accounts, returning null");
      return null;
    }

    // Filter transactions for the selected year
    const yearTransactions = allTransactions.filter(tx => {
      const txYear = new Date(tx.date).getFullYear();
      return txYear === selectedYear;
    });

    // Initialize CIT schedules based on FIRS requirements
    // Schedule 1: Revenue
    const schedule1_Revenue = {
      salesRevenue: 0,
      serviceRevenue: 0,
      rentalIncome: 0,
      interestIncome: 0,
      dividendIncome: 0,
      otherRevenue: 0,
      total: 0
    };

    // Schedule 2: Non-Current Assets
    const schedule2_NonCurrentAssets = {
      landAndBuildings: 0,
      plantAndMachinery: 0,
      motorVehicles: 0,
      furnitureAndFittings: 0,
      investments: 0,
      intangibleAssets: 0,
      otherNonCurrentAssets: 0,
      total: 0
    };

    // Schedule 3: Current Assets
    const schedule3_CurrentAssets = {
      cash: 0,
      bankBalances: 0,
      accountsReceivable: 0,
      inventory: 0,
      prepaidExpenses: 0,
      otherCurrentAssets: 0,
      total: 0
    };

    // Schedule 4: Cost of Sales
    const schedule4_CostOfSales = {
      openingStock: 0,
      purchases: 0,
      directLabor: 0,
      factoryOverheads: 0,
      closingStock: 0,
      total: 0
    };

    // Schedule 5: Other Income
    const schedule5_OtherIncome = {
      gainOnDisposal: 0,
      foreignExchangeGain: 0,
      miscellaneousIncome: 0,
      total: 0
    };

    // Schedule 6: Operating Expenses
    const schedule6_OperatingExpenses = {
      salariesAndWages: 0,
      rent: 0,
      utilities: 0,
      depreciation: 0,
      repairs: 0,
      insurance: 0,
      advertising: 0,
      professionalFees: 0,
      bankCharges: 0,
      transport: 0,
      officeSupplies: 0,
      badDebts: 0,
      otherExpenses: 0,
      total: 0
    };

    // Schedule 7: Current Liabilities
    const schedule7_CurrentLiabilities = {
      accountsPayable: 0,
      shortTermLoans: 0,
      accruedExpenses: 0,
      taxPayable: 0,
      otherCurrentLiabilities: 0,
      total: 0
    };

    // Schedule 8: Long Term Liabilities
    const schedule8_LongTermLiabilities = {
      longTermLoans: 0,
      mortgages: 0,
      bonds: 0,
      deferredTax: 0,
      otherLongTermLiabilities: 0,
      total: 0
    };

    // Schedule 9: Ownership/Capital Structure
    const schedule9_CapitalStructure = {
      shareCapital: additionalInfo.capitalContributions || 0,
      retainedEarnings: 0,
      reserves: 0,
      total: 0
    };

    // Schedule 10: Reserve
    const schedule10_Reserve = {
      statutoryReserve: 0,
      generalReserve: 0,
      capitalReserve: 0,
      otherReserves: 0,
      total: 0
    };

    // Schedule 11: Profit Adjustment
    const schedule11_ProfitAdjustment = {
      additionsToProfit: 0,
      deductionsFromProfit: 0,
      netAdjustment: 0
    };

    // Schedule 12: Balancing Adjustment
    const schedule12_BalancingAdjustment = {
      balancingItems: 0,
      adjustments: 0,
      total: 0
    };

    // Schedule 13: Loss Relieved
    const schedule13_LossRelieved = {
      currentYearLoss: 0,
      priorYearLossesRelieved: 0,
      totalLossRelieved: 0
    };

    // Schedule 14: Capital Allowance
    const schedule14_CapitalAllowance = {
      initialAllowance: 0,
      annualAllowance: 0,
      balancingAllowance: 0,
      balancingCharge: 0,
      totalCapitalAllowance: 0
    };

    // Process transactions using current category mappings
    yearTransactions.forEach(transaction => {
      const categoryId = categoryMappings[transaction.id];
      const amount = transaction.credit || transaction.debit || 0;
      
      // Only process categorized transactions
      if (!categoryId) return;
      
      if (transaction.credit > 0) {
        // Revenue transactions (Schedule 1)
        switch (categoryId) {
          case "sales":
            schedule1_Revenue.salesRevenue += amount;
            break;
          case "service-income":
            schedule1_Revenue.serviceRevenue += amount;
            break;
          case "rental-income":
            schedule1_Revenue.rentalIncome += amount;
            break;
          case "interest-income":
            schedule1_Revenue.interestIncome += amount;
            break;
          case "dividend-income":
            schedule1_Revenue.dividendIncome += amount;
            break;
          case "other-income":
            schedule1_Revenue.otherRevenue += amount;
            break;
        }
        schedule1_Revenue.total += amount;
      } else if (transaction.debit > 0) {
        // Expense and asset transactions
        switch (categoryId) {
          // Schedule 4: Cost of Sales
          case "inventory":
            schedule4_CostOfSales.purchases += amount;
            break;
          
          // Schedule 6: Operating Expenses
          case "salaries":
            schedule6_OperatingExpenses.salariesAndWages += amount;
            break;
          case "rent":
            schedule6_OperatingExpenses.rent += amount;
            break;
          case "utilities":
            schedule6_OperatingExpenses.utilities += amount;
            break;
          case "repairs":
            schedule6_OperatingExpenses.repairs += amount;
            break;
          case "depreciation":
            schedule6_OperatingExpenses.depreciation += amount;
            break;
          case "insurance":
            schedule6_OperatingExpenses.insurance += amount;
            break;
          case "marketing":
            schedule6_OperatingExpenses.advertising += amount;
            break;
          case "transport":
            schedule6_OperatingExpenses.transport += amount;
            break;
          case "professional-services":
            schedule6_OperatingExpenses.professionalFees += amount;
            break;
          case "office-supplies":
            schedule6_OperatingExpenses.officeSupplies += amount;
            break;
          case "bank-charges":
            schedule6_OperatingExpenses.bankCharges += amount;
            break;
          case "airtime":
            schedule6_OperatingExpenses.otherExpenses += amount;
            break;
          case "miscellaneous":
            schedule6_OperatingExpenses.otherExpenses += amount;
            break;
          
          // Schedule 2: Non-Current Assets
          case "equipment":
            schedule2_NonCurrentAssets.plantAndMachinery += amount;
            break;
          
          // Schedule 8: Long Term Liabilities (loan payments)
          case "loan-payment":
            schedule8_LongTermLiabilities.longTermLoans += amount;
            break;
          
          // Schedule 7: Current Liabilities (tax payments)
          case "tax-payments":
            schedule7_CurrentLiabilities.taxPayable += amount;
            break;
        }
      }
    });

    // Calculate totals for each schedule
    schedule6_OperatingExpenses.total = 
      schedule6_OperatingExpenses.salariesAndWages + 
      schedule6_OperatingExpenses.rent + 
      schedule6_OperatingExpenses.utilities + 
      schedule6_OperatingExpenses.depreciation + 
      schedule6_OperatingExpenses.repairs + 
      schedule6_OperatingExpenses.insurance + 
      schedule6_OperatingExpenses.advertising + 
      schedule6_OperatingExpenses.professionalFees + 
      schedule6_OperatingExpenses.bankCharges + 
      schedule6_OperatingExpenses.transport + 
      schedule6_OperatingExpenses.officeSupplies + 
      schedule6_OperatingExpenses.badDebts + 
      schedule6_OperatingExpenses.otherExpenses;

    schedule4_CostOfSales.total = schedule4_CostOfSales.openingStock + schedule4_CostOfSales.purchases + 
                                 schedule4_CostOfSales.directLabor + schedule4_CostOfSales.factoryOverheads - 
                                 schedule4_CostOfSales.closingStock;

    // Estimate current assets from account balances
    const finalBalance = accounts.reduce((sum, account) => {
      const accountBalance = account.accountInfo?.closingBalance || 0;
      return sum + accountBalance;
    }, 0);
    
    schedule3_CurrentAssets.bankBalances = Math.max(finalBalance, 0);
    schedule3_CurrentAssets.total = schedule3_CurrentAssets.cash + schedule3_CurrentAssets.bankBalances + 
                                   schedule3_CurrentAssets.accountsReceivable + schedule3_CurrentAssets.inventory + 
                                   schedule3_CurrentAssets.prepaidExpenses + schedule3_CurrentAssets.otherCurrentAssets;

    schedule2_NonCurrentAssets.total = schedule2_NonCurrentAssets.landAndBuildings + schedule2_NonCurrentAssets.plantAndMachinery + 
                                      schedule2_NonCurrentAssets.motorVehicles + schedule2_NonCurrentAssets.furnitureAndFittings + 
                                      schedule2_NonCurrentAssets.investments + schedule2_NonCurrentAssets.intangibleAssets + 
                                      schedule2_NonCurrentAssets.otherNonCurrentAssets;

    schedule5_OtherIncome.total = schedule5_OtherIncome.gainOnDisposal + schedule5_OtherIncome.foreignExchangeGain + 
                                 schedule5_OtherIncome.miscellaneousIncome;
    
    schedule7_CurrentLiabilities.total = schedule7_CurrentLiabilities.accountsPayable + schedule7_CurrentLiabilities.shortTermLoans + 
                                        schedule7_CurrentLiabilities.accruedExpenses + schedule7_CurrentLiabilities.taxPayable + 
                                        schedule7_CurrentLiabilities.otherCurrentLiabilities;
    
    schedule8_LongTermLiabilities.total = schedule8_LongTermLiabilities.longTermLoans + schedule8_LongTermLiabilities.mortgages + 
                                         schedule8_LongTermLiabilities.bonds + schedule8_LongTermLiabilities.deferredTax + 
                                         schedule8_LongTermLiabilities.otherLongTermLiabilities;

    schedule10_Reserve.total = schedule10_Reserve.statutoryReserve + schedule10_Reserve.generalReserve + 
                              schedule10_Reserve.capitalReserve + schedule10_Reserve.otherReserves;

    // Calculate profit and tax
    const grossProfit = schedule1_Revenue.total - schedule4_CostOfSales.total;
    const netProfitBeforeTax = grossProfit - schedule6_OperatingExpenses.total + schedule5_OtherIncome.total;
    const adjustedProfit = netProfitBeforeTax + schedule11_ProfitAdjustment.netAdjustment;
    const taxableProfit = Math.max(adjustedProfit - schedule13_LossRelieved.totalLossRelieved - schedule14_CapitalAllowance.totalCapitalAllowance, 0);
    const companyTax = taxableProfit * 0.30; // 30% CIT rate
    const educationTax = taxableProfit * 0.02; // 2% Education tax
    const totalTaxLiability = companyTax + educationTax;

    schedule9_CapitalStructure.retainedEarnings = netProfitBeforeTax - totalTaxLiability;
    schedule9_CapitalStructure.total = schedule9_CapitalStructure.shareCapital + schedule9_CapitalStructure.retainedEarnings + 
                                      schedule9_CapitalStructure.reserves;

    console.log("generateCITSchedules - Calculation complete");
    console.log("- Revenue total:", schedule1_Revenue.total);
    console.log("- Operating Expenses total:", schedule6_OperatingExpenses.total);
    console.log("- Taxable Profit:", taxableProfit);
    console.log("- Total Tax Liability:", totalTaxLiability);

    return {
      // All 16 FIRS schedules
      schedule1_Revenue,
      schedule2_NonCurrentAssets,
      schedule3_CurrentAssets,
      schedule4_CostOfSales,
      schedule5_OtherIncome,
      schedule6_OperatingExpenses,
      schedule7_CurrentLiabilities,
      schedule8_LongTermLiabilities,
      schedule9_CapitalStructure,
      schedule10_Reserve,
      schedule11_ProfitAdjustment,
      schedule12_BalancingAdjustment,
      schedule13_LossRelieved,
      schedule14_CapitalAllowance,
      
      // Legacy compatibility (for existing UI components)
      revenue: schedule1_Revenue,
      costOfSales: schedule4_CostOfSales,
      operatingExpenses: schedule6_OperatingExpenses,
      otherIncome: schedule5_OtherIncome,
      currentAssets: schedule3_CurrentAssets,
      nonCurrentAssets: schedule2_NonCurrentAssets,
      currentLiabilities: schedule7_CurrentLiabilities,
      longTermLiabilities: schedule8_LongTermLiabilities,
      capitalStructure: schedule9_CapitalStructure,
      
      profitSummary: {
        grossProfit,
        netProfitBeforeTax,
        adjustedProfit,
        taxableProfit,
        companyTax,
        educationTax,
        totalTaxLiability,
        netProfitAfterTax: netProfitBeforeTax - totalTaxLiability
      },
      balanceSheet: {
        totalAssets: schedule3_CurrentAssets.total + schedule2_NonCurrentAssets.total,
        totalLiabilities: schedule7_CurrentLiabilities.total + schedule8_LongTermLiabilities.total,
        totalEquity: schedule9_CapitalStructure.total
      }
    };
  }, [accounts, allTransactions, categoryMappings, selectedYear, additionalInfo]);

  const handleCategoryChange = useCallback((transactionId, categoryId) => {
    const newMappings = {
      ...categoryMappings,
      [transactionId]: categoryId
    };
    const newManualSet = new Set([...manuallySetTransactions, transactionId]);
    
    setCategoryMappings(newMappings);
    setManuallySetTransactions(newManualSet);
    
    // Track transaction history for Go Back functionality
    setTransactionHistory(prev => {
      const newHistory = [...prev];
      // Add current transaction to history if not already the last entry
      if (newHistory[newHistory.length - 1]?.id !== transactionId) {
        const transaction = allTransactions.find(t => t.id === transactionId);
        if (transaction) {
          newHistory.push({
            id: transactionId,
            narration: transaction.narration,
            categoryId,
            timestamp: Date.now()
          });
        }
      }
      // Keep only last 20 transactions in history
      return newHistory.slice(-20);
    });
    
    // Set as last categorized transaction
    setLastCategorizedTransaction({
      id: transactionId,
      categoryId,
      timestamp: Date.now()
    });
    
    // Save to localStorage
    try {
      localStorage.setItem(CIT_CATEGORY_MAPPINGS, JSON.stringify(newMappings));
      localStorage.setItem(CIT_MANUAL_TRANSACTIONS, JSON.stringify([...newManualSet]));
      console.log("Saved categorization to localStorage:", { transactionId, categoryId });
    } catch (error) {
      console.error("Error saving categorization:", error);
    }
    
    const categoryInfo = allCategories.find(cat => cat.id === categoryId);
    toast.success(`Category saved: ${categoryInfo?.name || categoryId}`);
  }, [categoryMappings, manuallySetTransactions, allTransactions, allCategories]);

  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      setPreviousTab(activeTab);
      setTabHistory(prev => {
        const newHistory = [...prev];
        // Add current tab to history if it's not the same as the last entry
        if (newHistory[newHistory.length - 1] !== newTab) {
          newHistory.push(newTab);
        }
        // Keep only last 10 tabs in history
        return newHistory.slice(-10);
      });
      setActiveTab(newTab);
    }
  };

  const handleGoBack = () => {
    if (previousTab) {
      const currentTab = activeTab;
      setActiveTab(previousTab);
      setPreviousTab(currentTab);
      toast.info(`Returned to ${getTabDisplayName(previousTab)}`);
    }
  };

  const handleGoBackToLastTransaction = () => {
    if (lastCategorizedTransaction && allTransactions.length > 0) {
      const transaction = allTransactions.find(t => t.id === lastCategorizedTransaction.id);
      if (transaction) {
        // Switch to categorize tab if not already there
        if (activeTab !== 'categorize') {
          handleTabChange('categorize');
        }
        
        // Clear search to ensure transaction is visible
        setSearchTerm("");
        
        // Wait for state updates and then scroll
        setTimeout(() => {
          // Find the transaction index in filtered transactions
          const currentFilteredTransactions = allTransactions.filter(tx => {
            const txYear = new Date(tx.date).getFullYear();
            return txYear === selectedYear;
          }).sort((a, b) => {
            if (a.debit > 0 && b.credit > 0) return -1;
            if (a.credit > 0 && b.debit > 0) return 1;
            return 0;
          });
          
          const transactionIndex = currentFilteredTransactions.findIndex(t => t.id === lastCategorizedTransaction.id);
          
          if (transactionIndex !== -1 && virtualizerRef.current) {
            // Calculate scroll position (itemHeight is 90px as defined in VirtualizedTransactionList)
            const itemHeight = 90;
            const scrollPosition = transactionIndex * itemHeight;
            
            // Scroll to the transaction
            if (virtualizerRef.current.scrollTo) {
              virtualizerRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
            } else if (virtualizerRef.current.scrollTop !== undefined) {
              virtualizerRef.current.scrollTop = scrollPosition;
            }
          }
          
          // Highlight the transaction temporarily
          setHighlightedTransaction(lastCategorizedTransaction.id);
          
          // Toast notification with transaction details
          const categoryInfo = allCategories.find(cat => cat.id === lastCategorizedTransaction.categoryId);
          toast.success(`Navigated to last categorized: "${transaction.narration.slice(0, 50)}..." → ${categoryInfo?.name || lastCategorizedTransaction.categoryId}`);
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedTransaction(null);
          }, 3000);
        }, 100);
      }
    }
  };

  const getTabDisplayName = (tabId) => {
    const tabNames = {
      "categorize": "Transaction Categorization",
      "cit-preview": "CIT Preview",
      "split-view": "Live View (Split)"
    };
    return tabNames[tabId] || tabId;
  };

  const handleAddNewCategory = () => {
    const categoryName = prompt("Enter the name for the new category:");
    if (categoryName && categoryName.trim()) {
      const newCategory = {
        id: `custom-${Date.now()}`,
        name: categoryName.trim(),
        type: "both",
        color: "teal"
      };
      addCustomCategory(newCategory);
      toast.success(`Added new category: ${newCategory.name}`);
    }
  };

  const filteredTransactions = useMemo(() => {
    console.log("filteredTransactions calculation - Debug Info:");
    console.log("- Accounts available:", !!accounts, "count:", accounts?.length);
    console.log("- All Transactions:", allTransactions?.length);
    console.log("- Selected Year:", selectedYear);
    console.log("- Search Term:", searchTerm);

    // Early return if no accounts or transactions are loaded yet
    if (!accounts || accounts.length === 0) {
      console.log("- No accounts available yet");
      return [];
    }

    let transactions = allTransactions;

    if (!transactions || transactions.length === 0) {
      console.log("- No transactions found in accounts");
      return [];
    }
    
    // Filter by selected year
    transactions = transactions.filter(tx => {
      if (!tx.date) {
        console.log("- Transaction missing date:", tx);
        return false;
      }
      const txYear = new Date(tx.date).getFullYear();
      return txYear === selectedYear;
    });
    
    console.log("- Transactions after year filter:", transactions.length);
    
    // Filter by search term
    if (searchTerm && searchTerm.trim()) {
      const trimmedSearch = searchTerm.trim().toLowerCase();
      transactions = transactions.filter(t => {
        const narration = (t.narration || "").toLowerCase().trim();
        return narration.includes(trimmedSearch);
      });
      console.log("- Transactions after search filter:", transactions.length);
    }
    
    // Sort: debits first, then credits
    return transactions.sort((a, b) => {
      // If one is debit and other is credit, debit comes first
      if (a.debit > 0 && b.credit > 0) return -1;
      if (a.credit > 0 && b.debit > 0) return 1;
      
      // If both are same type, maintain original order (or sort by amount)
      return 0;
    });
  }, [accounts, allTransactions, selectedYear, searchTerm]);

  const exportCITReturn = async () => {
    if (!generateCITSchedules) return;

    const wb = new ExcelJS.Workbook();
    const s = generateCITSchedules;

    // Company Information Sheet
    const companyInfoWs = wb.addWorksheet("Company Info");
    const companyInfoData = [
      ["COMPANY INCOME TAX RETURN - FIRS COMPLIANT", ""],
      ["Tax Year:", selectedYear],
      ["", ""],
      ["COMPANY DETAILS", ""],
      ["Company Name:", companyDetails.companyName],
      ["TIN Number:", companyDetails.tinNumber],
      ["RC Number:", companyDetails.rcNumber],
      ["Address:", companyDetails.address],
      ["Nature of Business:", companyDetails.businessNature],
      ["Accounting Period End:", companyDetails.accountingPeriod],
      ["", ""],
      ["All 16 FIRS Schedules Included", "✓"]
    ];
    companyInfoWs.addRows(companyInfoData);

    // Schedule 1: Revenue
    const schedule1Ws = wb.addWorksheet("Schedule 1 - Revenue");
    const schedule1Data = [
      ["SCHEDULE 1 - REVENUE", "Amount (₦)"],
      ["Sales Revenue", s.schedule1_Revenue.salesRevenue],
      ["Service Revenue", s.schedule1_Revenue.serviceRevenue],
      ["Rental Income", s.schedule1_Revenue.rentalIncome],
      ["Interest Income", s.schedule1_Revenue.interestIncome],
      ["Dividend Income", s.schedule1_Revenue.dividendIncome],
      ["Other Revenue", s.schedule1_Revenue.otherRevenue],
      ["TOTAL REVENUE", s.schedule1_Revenue.total]
    ];
    schedule1Ws.addRows(schedule1Data);

    // Schedule 2: Non-Current Assets
    const schedule2Ws = wb.addWorksheet("Schedule 2 - Non-Current");
    const schedule2Data = [
      ["SCHEDULE 2 - NON-CURRENT ASSETS", "Amount (₦)"],
      ["Land and Buildings", s.schedule2_NonCurrentAssets.landAndBuildings],
      ["Plant and Machinery", s.schedule2_NonCurrentAssets.plantAndMachinery],
      ["Motor Vehicles", s.schedule2_NonCurrentAssets.motorVehicles],
      ["Furniture and Fittings", s.schedule2_NonCurrentAssets.furnitureAndFittings],
      ["Investments", s.schedule2_NonCurrentAssets.investments],
      ["Intangible Assets", s.schedule2_NonCurrentAssets.intangibleAssets],
      ["Other Non-Current Assets", s.schedule2_NonCurrentAssets.otherNonCurrentAssets],
      ["TOTAL NON-CURRENT ASSETS", s.schedule2_NonCurrentAssets.total]
    ];
    schedule2Ws.addRows(schedule2Data);

    // Schedule 3: Current Assets
    const schedule3Ws = wb.addWorksheet("Schedule 3 - Current Assets");
    const schedule3Data = [
      ["SCHEDULE 3 - CURRENT ASSETS", "Amount (₦)"],
      ["Cash in Hand", s.schedule3_CurrentAssets.cash],
      ["Bank Balances", s.schedule3_CurrentAssets.bankBalances],
      ["Accounts Receivable", s.schedule3_CurrentAssets.accountsReceivable],
      ["Inventory", s.schedule3_CurrentAssets.inventory],
      ["Prepaid Expenses", s.schedule3_CurrentAssets.prepaidExpenses],
      ["Other Current Assets", s.schedule3_CurrentAssets.otherCurrentAssets],
      ["TOTAL CURRENT ASSETS", s.schedule3_CurrentAssets.total]
    ];
    schedule3Ws.addRows(schedule3Data);

    // Schedule 4: Cost of Sales
    const schedule4Ws = wb.addWorksheet("Schedule 4 - Cost of Sales");
    const schedule4Data = [
      ["SCHEDULE 4 - COST OF SALES", "Amount (₦)"],
      ["Opening Stock", s.schedule4_CostOfSales.openingStock],
      ["Purchases", s.schedule4_CostOfSales.purchases],
      ["Direct Labor", s.schedule4_CostOfSales.directLabor],
      ["Factory Overheads", s.schedule4_CostOfSales.factoryOverheads],
      ["Less: Closing Stock", s.schedule4_CostOfSales.closingStock],
      ["TOTAL COST OF SALES", s.schedule4_CostOfSales.total]
    ];
    schedule4Ws.addRows(schedule4Data);

    // Schedule 5: Other Income
    const schedule5Ws = wb.addWorksheet("Schedule 5 - Other Income");
    const schedule5Data = [
      ["SCHEDULE 5 - OTHER INCOME", "Amount (₦)"],
      ["Gain on Disposal of Assets", s.schedule5_OtherIncome.gainOnDisposal],
      ["Foreign Exchange Gain", s.schedule5_OtherIncome.foreignExchangeGain],
      ["Miscellaneous Income", s.schedule5_OtherIncome.miscellaneousIncome],
      ["TOTAL OTHER INCOME", s.schedule5_OtherIncome.total]
    ];
    schedule5Ws.addRows(schedule5Data);

    // Schedule 6: Operating Expenses
    const schedule6Ws = wb.addWorksheet("Schedule 6 - Operating Exp");
    const schedule6Data = [
      ["SCHEDULE 6 - OPERATING EXPENSES", "Amount (₦)"],
      ["Salaries and Wages", s.schedule6_OperatingExpenses.salariesAndWages],
      ["Rent", s.schedule6_OperatingExpenses.rent],
      ["Utilities", s.schedule6_OperatingExpenses.utilities],
      ["Depreciation", s.schedule6_OperatingExpenses.depreciation],
      ["Repairs and Maintenance", s.schedule6_OperatingExpenses.repairs],
      ["Insurance", s.schedule6_OperatingExpenses.insurance],
      ["Advertising", s.schedule6_OperatingExpenses.advertising],
      ["Professional Fees", s.schedule6_OperatingExpenses.professionalFees],
      ["Bank Charges", s.schedule6_OperatingExpenses.bankCharges],
      ["Transport", s.schedule6_OperatingExpenses.transport],
      ["Office Supplies", s.schedule6_OperatingExpenses.officeSupplies],
      ["Bad Debts", s.schedule6_OperatingExpenses.badDebts],
      ["Other Expenses", s.schedule6_OperatingExpenses.otherExpenses],
      ["TOTAL OPERATING EXPENSES", s.schedule6_OperatingExpenses.total]
    ];
    schedule6Ws.addRows(schedule6Data);

    // Schedule 7: Current Liabilities
    const schedule7Ws = wb.addWorksheet("Schedule 7 - Current Liab");
    const schedule7Data = [
      ["SCHEDULE 7 - CURRENT LIABILITIES", "Amount (₦)"],
      ["Accounts Payable", s.schedule7_CurrentLiabilities.accountsPayable],
      ["Short Term Loans", s.schedule7_CurrentLiabilities.shortTermLoans],
      ["Accrued Expenses", s.schedule7_CurrentLiabilities.accruedExpenses],
      ["Tax Payable", s.schedule7_CurrentLiabilities.taxPayable],
      ["Other Current Liabilities", s.schedule7_CurrentLiabilities.otherCurrentLiabilities],
      ["TOTAL CURRENT LIABILITIES", s.schedule7_CurrentLiabilities.total]
    ];
    schedule7Ws.addRows(schedule7Data);

    // Schedule 8: Long Term Liabilities
    const schedule8Ws = wb.addWorksheet("Schedule 8 - Long Term Liab");
    const schedule8Data = [
      ["SCHEDULE 8 - LONG TERM LIABILITIES", "Amount (₦)"],
      ["Long Term Loans", s.schedule8_LongTermLiabilities.longTermLoans],
      ["Mortgages", s.schedule8_LongTermLiabilities.mortgages],
      ["Bonds", s.schedule8_LongTermLiabilities.bonds],
      ["Deferred Tax", s.schedule8_LongTermLiabilities.deferredTax],
      ["Other Long Term Liabilities", s.schedule8_LongTermLiabilities.otherLongTermLiabilities],
      ["TOTAL LONG TERM LIABILITIES", s.schedule8_LongTermLiabilities.total]
    ];
    schedule8Ws.addRows(schedule8Data);

    // Schedule 9: Ownership/Capital Structure
    const schedule9Ws = wb.addWorksheet("Schedule 9 - Capital");
    const schedule9Data = [
      ["SCHEDULE 9 - OWNERSHIP/CAPITAL STRUCTURE", "Amount (₦)"],
      ["Share Capital", s.schedule9_CapitalStructure.shareCapital],
      ["Retained Earnings", s.schedule9_CapitalStructure.retainedEarnings],
      ["Reserves", s.schedule9_CapitalStructure.reserves],
      ["TOTAL CAPITAL", s.schedule9_CapitalStructure.total]
    ];
    schedule9Ws.addRows(schedule9Data);

    // Schedule 10: Reserve
    const schedule10Ws = wb.addWorksheet("Schedule 10 - Reserve");
    const schedule10Data = [
      ["SCHEDULE 10 - RESERVE", "Amount (₦)"],
      ["Statutory Reserve", s.schedule10_Reserve.statutoryReserve],
      ["General Reserve", s.schedule10_Reserve.generalReserve],
      ["Capital Reserve", s.schedule10_Reserve.capitalReserve],
      ["Other Reserves", s.schedule10_Reserve.otherReserves],
      ["TOTAL RESERVES", s.schedule10_Reserve.total]
    ];
    schedule10Ws.addRows(schedule10Data);

    // Schedule 11: Profit Adjustment
    const schedule11Ws = wb.addWorksheet("Schedule 11 - Profit Adj");
    const schedule11Data = [
      ["SCHEDULE 11 - PROFIT ADJUSTMENT", "Amount (₦)"],
      ["Additions to Profit", s.schedule11_ProfitAdjustment.additionsToProfit],
      ["Deductions from Profit", s.schedule11_ProfitAdjustment.deductionsFromProfit],
      ["NET ADJUSTMENT", s.schedule11_ProfitAdjustment.netAdjustment]
    ];
    schedule11Ws.addRows(schedule11Data);

    // Schedule 12: Balancing Adjustment
    const schedule12Ws = wb.addWorksheet("Schedule 12 - Balancing");
    const schedule12Data = [
      ["SCHEDULE 12 - BALANCING ADJUSTMENT", "Amount (₦)"],
      ["Balancing Items", s.schedule12_BalancingAdjustment.balancingItems],
      ["Adjustments", s.schedule12_BalancingAdjustment.adjustments],
      ["TOTAL BALANCING ADJUSTMENT", s.schedule12_BalancingAdjustment.total]
    ];
    schedule12Ws.addRows(schedule12Data);

    // Schedule 13: Loss Relieved
    const schedule13Ws = wb.addWorksheet("Schedule 13 - Loss Relief");
    const schedule13Data = [
      ["SCHEDULE 13 - LOSS RELIEVED", "Amount (₦)"],
      ["Current Year Loss", s.schedule13_LossRelieved.currentYearLoss],
      ["Prior Year Losses Relieved", s.schedule13_LossRelieved.priorYearLossesRelieved],
      ["TOTAL LOSS RELIEVED", s.schedule13_LossRelieved.totalLossRelieved]
    ];
    schedule13Ws.addRows(schedule13Data);

    // Schedule 14: Capital Allowance
    const schedule14Ws = wb.addWorksheet("Schedule 14 - Capital Allow");
    const schedule14Data = [
      ["SCHEDULE 14 - CAPITAL ALLOWANCE", "Amount (₦)"],
      ["Initial Allowance", s.schedule14_CapitalAllowance.initialAllowance],
      ["Annual Allowance", s.schedule14_CapitalAllowance.annualAllowance],
      ["Balancing Allowance", s.schedule14_CapitalAllowance.balancingAllowance],
      ["Balancing Charge", s.schedule14_CapitalAllowance.balancingCharge],
      ["TOTAL CAPITAL ALLOWANCE", s.schedule14_CapitalAllowance.totalCapitalAllowance]
    ];
    schedule14Ws.addRows(schedule14Data);

    // Profit & Loss Statement
    const plWs = wb.addWorksheet("Profit & Loss Statement");
    const plData = [
      ["PROFIT & LOSS STATEMENT", "Amount (₦)"],
      ["Revenue (Schedule 1)", s.schedule1_Revenue.total],
      ["Less: Cost of Sales (Schedule 4)", s.schedule4_CostOfSales.total],
      ["GROSS PROFIT", s.profitSummary.grossProfit],
      ["Less: Operating Expenses (Schedule 6)", s.schedule6_OperatingExpenses.total],
      ["Add: Other Income (Schedule 5)", s.schedule5_OtherIncome.total],
      ["NET PROFIT BEFORE TAX", s.profitSummary.netProfitBeforeTax],
      ["Add: Profit Adjustments (Schedule 11)", s.schedule11_ProfitAdjustment.netAdjustment],
      ["ADJUSTED PROFIT", s.profitSummary.adjustedProfit],
      ["Less: Loss Relieved (Schedule 13)", s.schedule13_LossRelieved.totalLossRelieved],
      ["Less: Capital Allowance (Schedule 14)", s.schedule14_CapitalAllowance.totalCapitalAllowance],
      ["", ""],
      ["TAX COMPUTATION", ""],
      ["TAXABLE PROFIT", s.profitSummary.taxableProfit],
      ["Company Income Tax (30%)", s.profitSummary.companyTax],
      ["Education Tax (2%)", s.profitSummary.educationTax],
      ["TOTAL TAX LIABILITY", s.profitSummary.totalTaxLiability],
      ["NET PROFIT AFTER TAX", s.profitSummary.netProfitAfterTax]
    ];
    plWs.addRows(plData);

    // Balance Sheet
    const bsWs = wb.addWorksheet("Balance Sheet");
    const bsData = [
      ["BALANCE SHEET", "Amount (₦)"],
      ["ASSETS", ""],
      ["Current Assets (Schedule 3)", s.schedule3_CurrentAssets.total],
      ["Non-Current Assets (Schedule 2)", s.schedule2_NonCurrentAssets.total],
      ["TOTAL ASSETS", s.balanceSheet.totalAssets],
      ["", ""],
      ["LIABILITIES", ""],
      ["Current Liabilities (Schedule 7)", s.schedule7_CurrentLiabilities.total],
      ["Long Term Liabilities (Schedule 8)", s.schedule8_LongTermLiabilities.total],
      ["TOTAL LIABILITIES", s.balanceSheet.totalLiabilities],
      ["", ""],
      ["EQUITY", ""],
      ["Capital Structure (Schedule 9)", s.schedule9_CapitalStructure.total],
      ["Reserves (Schedule 10)", s.schedule10_Reserve.total],
      ["TOTAL EQUITY", s.balanceSheet.totalEquity],
      ["", ""],
      ["TOTAL LIABILITIES & EQUITY", s.balanceSheet.totalLiabilities + s.balanceSheet.totalEquity]
    ];
    bsWs.addRows(bsData);

    const filename = `FIRS_CIT_Return_${companyDetails.companyName || 'Company'}_${selectedYear}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Complete FIRS CIT Return (16 Schedules) exported successfully!");
  };

  const formatCurrency = (amount) => {
    return `₦${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  const getCITScheduleForCategory = (categoryId) => {
    const scheduleMapping = {
      // Schedule 1: Revenue
      "sales": "Schedule 1 - Revenue",
      "service-income": "Schedule 1 - Revenue", 
      "rental-income": "Schedule 1 - Revenue",
      "interest-income": "Schedule 1 - Revenue",
      "dividend-income": "Schedule 1 - Revenue",
      "other-income": "Schedule 1 - Revenue",
      
      // Schedule 2: Non-Current Assets  
      "equipment": "Schedule 2 - Non-Current Assets",
      
      // Schedule 4: Cost of Sales
      "inventory": "Schedule 4 - Cost of Sales",
      
      // Schedule 6: Operating Expenses
      "salaries": "Schedule 6 - Operating Expenses",
      "rent": "Schedule 6 - Operating Expenses",
      "utilities": "Schedule 6 - Operating Expenses",
      "repairs": "Schedule 6 - Operating Expenses",
      "depreciation": "Schedule 6 - Operating Expenses", 
      "insurance": "Schedule 6 - Operating Expenses",
      "marketing": "Schedule 6 - Operating Expenses",
      "transport": "Schedule 6 - Operating Expenses",
      "professional-services": "Schedule 6 - Operating Expenses",
      "office-supplies": "Schedule 6 - Operating Expenses",
      "bank-charges": "Schedule 6 - Operating Expenses",
      "airtime": "Schedule 6 - Operating Expenses",
      "miscellaneous": "Schedule 6 - Operating Expenses",
      
      // Schedule 7: Current Liabilities
      "tax-payments": "Schedule 7 - Current Liabilities",
      
      // Schedule 8: Long Term Liabilities
      "loan-payment": "Schedule 8 - Long Term Liabilities",
      
      // Other categories
      "transfer": "Not Applicable to FIRS Schedules"
    };
    return scheduleMapping[categoryId] || "Select a category to see FIRS schedule";
  };

  const renderTransactionRow = useCallback((transaction) => {
    const currentCategory = categoryMappings[transaction.id] || "";
    const categoryInfo = currentCategory ? allCategories.find(cat => cat.id === currentCategory) : null;
    const isManuallySet = manuallySetTransactions.has(transaction.id);
    const isHighlighted = highlightedTransaction === transaction.id;

    return (
      <div className={`py-4 flex items-center justify-between border-b border-gray-100 transition-colors duration-300 ${
        isHighlighted ? 'bg-yellow-100 border-yellow-300' :
        isManuallySet ? 'bg-blue-50' : 'bg-white'
      }`}>
        <div className="flex-1 pr-4">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-900 truncate">{transaction.narration}</p>
            {isManuallySet && (
              <span className="ml-2 text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full">
                Manual
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {new Date(transaction.date).toLocaleDateString()} -
            <span className={`font-semibold ${transaction.credit > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.credit > 0 ? ` ₦${transaction.credit.toLocaleString()}` : ` ₦${transaction.debit.toLocaleString()}`}
            </span>
          </p>
          <div className="flex items-center mt-1">
            {categoryInfo ? (
              <>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  categoryInfo.type === 'income' ? 'bg-green-100 text-green-800' :
                  categoryInfo.type === 'expense' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {categoryInfo.name}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  → CIT Schedule: {getCITScheduleForCategory(currentCategory)}
                </span>
              </>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                Uncategorized
              </span>
            )}
          </div>
        </div>
        <div className="ml-4">
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={`border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isManuallySet ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <option value="">-- Select Category --</option>
            <optgroup label="Income">
              {allCategories.filter(c => c.type === 'income').map(cat =>
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              )}
            </optgroup>
            <optgroup label="Expenses">
              {allCategories.filter(c => c.type === 'expense').map(cat =>
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              )}
            </optgroup>
            <optgroup label="Other">
              {allCategories.filter(c => c.type === 'both').map(cat =>
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              )}
            </optgroup>
          </select>
        </div>
      </div>
    );
  }, [categoryMappings, allCategories, manuallySetTransactions, highlightedTransaction, handleCategoryChange, getCITScheduleForCategory]);

  // Loading state when accounts are not yet available
  if (!accounts) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-blue-400">
        <p className="text-gray-600">Loading account data...</p>
      </div>
    );
  }

  // No data state when accounts array is empty
  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-gray-400">
        <p className="text-gray-600">No data available. Please upload your account statements first.</p>
      </div>
    );
  }

  // Debug info component
  const DebugInfo = () => {
    const savedMappingsCount = (() => {
      try {
        const saved = localStorage.getItem(CIT_CATEGORY_MAPPINGS);
        return saved ? Object.keys(JSON.parse(saved)).length : 0;
      } catch {
        return 0;
      }
    })();

    const accountsWithTransactions = accounts?.filter(acc => acc.transactions && acc.transactions.length > 0)?.length || 0;
    const totalTransactionsInAccounts = accounts?.reduce((sum, acc) => sum + (acc.transactions?.length || 0), 0) || 0;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <strong>Status:</strong>
        Accounts: {accounts?.length || 0} ({accountsWithTransactions} with transactions) |
        Raw Transactions: {totalTransactionsInAccounts} |
        All Transactions: {allTransactions?.length || 0} |
        Filtered ({selectedYear}): {filteredTransactions?.length || 0} |
        Categorized: {Object.keys(categoryMappings).length} |
        Manual: {manuallySetTransactions.size} |
        Saved: {savedMappingsCount} |
        <span className="text-green-600">✓ Auto-categorization OFF</span> |
        <span className="text-blue-600">💾 Persistence ON</span>
        {previousTab && (
          <>
            {" | "}
            <span className="text-purple-600">
              🔙 Can go back to {getTabDisplayName(previousTab)}
            </span>
          </>
        )}
        {activeTab === 'categorize' && lastCategorizedTransaction && (
          <>
            {" | "}
            <span className="text-yellow-600">
              📍 Last transaction available
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Transaction Categorization & CIT Filing</h2>
            <div className="flex items-center space-x-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="flex space-x-2">
                {allTransactions.length === 0 && accounts && accounts.length > 0 && (
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                    title="Refresh page if transactions are not loading properly"
                  >
                    🔄 Refresh Data
                  </button>
                )}
                {lastCategorizedTransaction && (
                  <button
                    onClick={handleGoBackToLastTransaction}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                    title="Navigate to and highlight the last categorized transaction (Alt + Shift + ← shortcut)"
                  >
                    📍 Go to Last Transaction
                  </button>
                )}
                <button
                  onClick={() => {
                    // Clear all categorizations and localStorage
                    setManuallySetTransactions(new Set());
                    setCategoryMappings({});
                    try {
                      localStorage.removeItem(CIT_CATEGORY_MAPPINGS);
                      localStorage.removeItem(CIT_MANUAL_TRANSACTIONS);
                      console.log("Cleared all saved categorizations from localStorage");
                    } catch (error) {
                      console.error("Error clearing localStorage:", error);
                    }
                    toast.info("All categorizations cleared permanently");
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  🗑️ Clear All Saved
                </button>
                <button
                  onClick={handleAddNewCategory}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  + Add Category
                </button>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <nav className="flex items-center justify-between">
            <div className="flex space-x-8">
              <button
                onClick={() => handleTabChange("categorize")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "categorize"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📊 Categorize Transactions
              </button>
              <button
                onClick={() => handleTabChange("cit-preview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "cit-preview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                🏛️ CIT Preview
              </button>
              <button
                onClick={() => handleTabChange("split-view")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "split-view"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ⚡ Live View (Split)
              </button>
            </div>
            
            {/* Go Back Button */}
            {previousTab && (
              <button
                onClick={handleGoBack}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title={`Go back to ${getTabDisplayName(previousTab)} (Alt + ← shortcut)\nTransaction navigation: Alt + Shift + ←`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Go Back to Last Stop
                <span className="ml-1 text-xs bg-gray-200 px-1 rounded">Alt+←</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        <DebugInfo />
        
        {/* Transaction Categorization Tab */}
        {activeTab === "categorize" && (
          <div>
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search transactions by description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                    title="Clear search and return to all transactions"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredTransactions.length} transactions for {selectedYear}
                {allTransactions.length > 0 && filteredTransactions.length === 0 && (
                  <span className="text-orange-600 ml-2">
                    (No transactions found for this year - try a different year)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-blue-600 font-medium">
                  {manuallySetTransactions.size} manually categorized
                </span>
                <span className="text-green-600 font-medium">
                  {filteredTransactions.filter(t => categoryMappings[t.id] && allCategories.find(c => c.id === categoryMappings[t.id])?.type === 'income').length} income
                </span>
                <span className="text-red-600 font-medium">
                  {filteredTransactions.filter(t => categoryMappings[t.id] && allCategories.find(c => c.id === categoryMappings[t.id])?.type === 'expense').length} expenses
                </span>
              </div>
            </div>

            {/* Go Back to Last Transaction Section */}
            {lastCategorizedTransaction && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">
                      Last categorized: <span className="font-medium">{
                        allTransactions.find(t => t.id === lastCategorizedTransaction.id)?.narration?.slice(0, 40) || 'Transaction'
                      }...</span>
                    </span>
                    <span className="ml-2 text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full">
                      {allCategories.find(cat => cat.id === lastCategorizedTransaction.categoryId)?.name || lastCategorizedTransaction.categoryId}
                    </span>
                  </div>
                  <button
                    onClick={handleGoBackToLastTransaction}
                    className="flex items-center px-3 py-1 text-sm text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded-md transition-colors"
                    title="Navigate to and highlight the last categorized transaction (Alt + Shift + ← shortcut)"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Go Back to Transaction
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-b">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
                  <p className="text-gray-600 mb-4">
                    {allTransactions.length === 0 
                      ? "No transactions were found in your account statements."
                      : `No transactions found for ${selectedYear}. Try selecting a different year.`
                    }
                  </p>
                  {searchTerm && (
                    <p className="text-sm text-gray-500">
                      Clear your search term "{searchTerm}" to see all transactions.
                    </p>
                  )}
                </div>
              ) : (
                <VirtualizedTransactionList
                  ref={virtualizerRef}
                  transactions={filteredTransactions}
                  renderItem={renderTransactionRow}
                  itemHeight={90}
                  containerHeight={500}
                />
              )}
            </div>
          </div>
        )}

        {/* CIT Preview Tab */}
        {activeTab === "cit-preview" && (
          <div>
            {!generateCITSchedules ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏛️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">CIT Calculations Not Available</h3>
                <p className="text-gray-600 mb-4">
                  CIT schedules cannot be generated. This could be because:
                </p>
                <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
                  <li>• No account data loaded</li>
                  <li>• No transactions found for {selectedYear}</li>
                  <li>• Calculation error occurred</li>
                </ul>
                <p className="text-sm text-blue-600 mt-4">
                  Check the debug info above and try switching to a different year or uploading data.
                </p>
              </div>
            ) : (
              <>
                {/* Company Details */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-3">Company Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={companyDetails.companyName}
                  onChange={(e) => setCompanyDetails(prev => ({ ...prev, companyName: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="TIN Number"
                  value={companyDetails.tinNumber}
                  onChange={(e) => setCompanyDetails(prev => ({ ...prev, tinNumber: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="RC Number"
                  value={companyDetails.rcNumber}
                  onChange={(e) => setCompanyDetails(prev => ({ ...prev, rcNumber: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Business Address"
                  value={companyDetails.address}
                  onChange={(e) => setCompanyDetails(prev => ({ ...prev, address: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Tax Computation Summary */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Tax Computation Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Taxable Profit</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(generateCITSchedules.profitSummary.taxableProfit)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600">Company Tax (30%)</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(generateCITSchedules.profitSummary.companyTax)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">Education Tax (2%)</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(generateCITSchedules.profitSummary.educationTax)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600">Total Tax Liability</p>
                  <p className="text-xl font-bold text-purple-700">
                    {formatCurrency(generateCITSchedules.profitSummary.totalTaxLiability)}
                  </p>
                </div>
              </div>
            </div>

            {/* CIT Schedules Preview */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">CIT Schedules Preview</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-sm text-gray-800 mb-2">📈 Revenue</h5>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(generateCITSchedules.revenue.total)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-sm text-gray-800 mb-2">📦 Cost of Sales</h5>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(generateCITSchedules.costOfSales.total)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-sm text-gray-800 mb-2">💰 Operating Expenses</h5>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(generateCITSchedules.operatingExpenses.total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={exportCITReturn}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-6 rounded-md flex items-center text-lg"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Complete CIT Return
              </button>
            </div>
              </>
            )}
          </div>
        )}

        {/* Split View Tab */}
        {activeTab === "split-view" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Transaction Categorization */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Categorize Transactions</h3>
              
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                {filteredTransactions.length} transactions • {manuallySetTransactions.size} manual
              </div>

              <div className="border rounded-lg">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">📊</div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">No Transactions</h4>
                    <p className="text-xs text-gray-600">
                      {allTransactions.length === 0 
                        ? "No transactions in accounts"
                        : `No transactions for ${selectedYear}`
                      }
                    </p>
                  </div>
                ) : (
                  <VirtualizedTransactionList
                    ref={virtualizerRef}
                    transactions={filteredTransactions}
                    renderItem={renderTransactionRow}
                    itemHeight={90}
                    containerHeight={400}
                  />
                )}
              </div>
            </div>

            {/* Right Panel: Live CIT Results */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🏛️ Live CIT Results</h3>
              
              {generateCITSchedules ? (
                <div className="space-y-4">
                  {/* Quick Tax Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600">Taxable Profit</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(generateCITSchedules.profitSummary.taxableProfit)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-600">Total Tax</p>
                      <p className="text-lg font-bold text-purple-700">
                        {formatCurrency(generateCITSchedules.profitSummary.totalTaxLiability)}
                      </p>
                    </div>
                  </div>

                  {/* Schedule Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="text-sm font-medium">Revenue</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(generateCITSchedules.revenue.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <span className="text-sm font-medium">Operating Expenses</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(generateCITSchedules.operatingExpenses.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(generateCITSchedules.profitSummary.netProfitBeforeTax)}
                      </span>
                    </div>
                  </div>

                  {/* Company Details Form */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Company Info</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={companyDetails.companyName}
                        onChange={(e) => setCompanyDetails(prev => ({ ...prev, companyName: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="TIN Number"
                        value={companyDetails.tinNumber}
                        onChange={(e) => setCompanyDetails(prev => ({ ...prev, tinNumber: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={exportCITReturn}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CIT Return
                  </button>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  No CIT data available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedCITManager;