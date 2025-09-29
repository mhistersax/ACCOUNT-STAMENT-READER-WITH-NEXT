"use client";
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import ExcelJS from "exceljs";

const CITFilingAssistant = ({ accounts, categoryMappings = {} }) => {
  const [isOpen, setIsOpen] = useState(true);
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

  const generateCITSchedules = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    const allTransactions = accounts.flatMap(account => account.transactions || []);

    // Filter transactions for the selected year
    const yearTransactions = allTransactions.filter(tx => {
      const txYear = new Date(tx.date).getFullYear();
      return txYear === selectedYear;
    });

    // Schedule 1: Revenue
    const revenue = {
      salesRevenue: 0,
      serviceRevenue: 0,
      rentalIncome: 0,
      interestIncome: 0,
      dividendIncome: 0,
      otherRevenue: 0,
      total: 0
    };

    // Schedule 2: Cost of Sales
    const costOfSales = {
      openingStock: 0,
      purchases: 0,
      directLabor: 0,
      factoryOverheads: 0,
      closingStock: 0,
      total: 0
    };

    // Schedule 3: Operating Expenses
    const operatingExpenses = {
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

    // Schedule 4: Other Income
    const otherIncome = {
      gainOnDisposal: 0,
      foreignExchangeGain: 0,
      miscellaneousIncome: 0,
      total: 0
    };

    // Schedule 5: Current Assets
    const currentAssets = {
      cash: 0,
      bankBalances: 0,
      accountsReceivable: 0,
      inventory: 0,
      prepaidExpenses: 0,
      otherCurrentAssets: 0,
      total: 0
    };

    // Schedule 6: Non-Current Assets
    const nonCurrentAssets = {
      landAndBuildings: 0,
      plantAndMachinery: 0,
      motorVehicles: 0,
      furnitureAndFittings: 0,
      investments: 0,
      intangibleAssets: 0,
      otherNonCurrentAssets: 0,
      total: 0
    };

    // Schedule 7: Current Liabilities
    const currentLiabilities = {
      accountsPayable: 0,
      shortTermLoans: 0,
      accruedExpenses: 0,
      taxPayable: 0,
      otherCurrentLiabilities: 0,
      total: 0
    };

    // Schedule 8: Long Term Liabilities
    const longTermLiabilities = {
      longTermLoans: 0,
      mortgages: 0,
      bonds: 0,
      deferredTax: 0,
      otherLongTermLiabilities: 0,
      total: 0
    };

    // Schedule 9: Capital Structure
    const capitalStructure = {
      shareCapital: additionalInfo.capitalContributions || 0,
      retainedEarnings: 0,
      reserves: 0,
      total: 0
    };

    // Process transactions and map to appropriate schedules based on user-defined categories
    yearTransactions.forEach(transaction => {
      const categoryId = categoryMappings[transaction.id] || "miscellaneous";
      const amount = transaction.credit || transaction.debit || 0;
      
      if (transaction.credit > 0) {
        // Revenue and Other Income transactions
        switch (categoryId) {
          case "sales":
          case "service-income":
            revenue.salesRevenue += amount;
            break;
          case "rental-income":
            revenue.rentalIncome += amount;
            break;
          case "interest-income":
            revenue.interestIncome += amount;
            break;
          case "dividend-income":
            revenue.dividendIncome += amount;
            break;
          case "other-income":
          case "miscellaneous": // Uncategorized income
            revenue.otherRevenue += amount;
            break;
          default:
            revenue.otherRevenue += amount;
        }
        revenue.total += amount;
      } else if (transaction.debit > 0) {
        // Expense transactions
        switch (categoryId) {
          case "inventory":
            costOfSales.purchases += amount;
            break;
          case "salaries":
            operatingExpenses.salariesAndWages += amount;
            break;
          case "rent":
            operatingExpenses.rent += amount;
            break;
          case "utilities":
            operatingExpenses.utilities += amount;
            break;
          case "repairs":
            operatingExpenses.repairs += amount;
            break;
          case "depreciation":
            operatingExpenses.depreciation += amount;
            break;
          case "insurance":
            operatingExpenses.insurance += amount;
            break;
          case "marketing":
            operatingExpenses.advertising += amount;
            break;
          case "transport":
            operatingExpenses.transport += amount;
            break;
          case "professional-services":
            operatingExpenses.professionalFees += amount;
            break;
          case "office-supplies":
            operatingExpenses.officeSupplies += amount;
            break;
          case "bank-charges":
            operatingExpenses.bankCharges += amount;
            break;
          case "equipment": // Assuming equipment purchase is a capital expenditure, handled under assets
            nonCurrentAssets.plantAndMachinery += amount;
            break;
          case "loan-payment": // Assuming this is repayment of principal + interest
            // This is complex; for simplicity, we'll add to other expenses.
            // A more detailed app would split principal and interest.
            operatingExpenses.otherExpenses += amount;
            break;
          case "tax-payments":
            // Tax payments are typically handled separately, not as an operating expense.
            // For now, adding to other expenses for visibility.
            operatingExpenses.otherExpenses += amount;
            break;
          case "miscellaneous":
          default:
            operatingExpenses.otherExpenses += amount;
        }
        // We sum up total operating expenses at the end based on the fields.
      }
    });

    // Sum up total operating expenses from the individual fields
    operatingExpenses.total = 
      operatingExpenses.salariesAndWages + 
      operatingExpenses.rent + 
      operatingExpenses.utilities + 
      operatingExpenses.depreciation + 
      operatingExpenses.repairs + 
      operatingExpenses.insurance + 
      operatingExpenses.advertising + 
      operatingExpenses.professionalFees + 
      operatingExpenses.bankCharges + 
      operatingExpenses.transport + 
      operatingExpenses.officeSupplies + 
      operatingExpenses.badDebts + 
      operatingExpenses.otherExpenses;

    // Calculate cost of sales total
    costOfSales.total = costOfSales.openingStock + costOfSales.purchases + 
                       costOfSales.directLabor + costOfSales.factoryOverheads - 
                       costOfSales.closingStock;

    // Estimate current assets (simplified)
    const finalBalance = accounts.reduce((sum, account) => {
      const accountBalance = account.accountInfo?.closingBalance || 0;
      return sum + accountBalance;
    }, 0);
    
    currentAssets.bankBalances = Math.max(finalBalance, 0);
    currentAssets.total = currentAssets.cash + currentAssets.bankBalances + 
                         currentAssets.accountsReceivable + currentAssets.inventory + 
                         currentAssets.prepaidExpenses + currentAssets.otherCurrentAssets;

    nonCurrentAssets.total = nonCurrentAssets.landAndBuildings + nonCurrentAssets.plantAndMachinery + 
                            nonCurrentAssets.motorVehicles + nonCurrentAssets.furnitureAndFittings + 
                            nonCurrentAssets.investments + nonCurrentAssets.intangibleAssets + 
                            nonCurrentAssets.otherNonCurrentAssets;

    // Calculate totals for other schedules
    otherIncome.total = otherIncome.gainOnDisposal + otherIncome.foreignExchangeGain + otherIncome.miscellaneousIncome;
    currentLiabilities.total = currentLiabilities.accountsPayable + currentLiabilities.shortTermLoans + 
                              currentLiabilities.accruedExpenses + currentLiabilities.taxPayable + 
                              currentLiabilities.otherCurrentLiabilities;
    longTermLiabilities.total = longTermLiabilities.longTermLoans + longTermLiabilities.mortgages + 
                               longTermLiabilities.bonds + longTermLiabilities.deferredTax + 
                               longTermLiabilities.otherLongTermLiabilities;

    // Calculate profit and tax liability
    const grossProfit = revenue.total - costOfSales.total;
    const netProfitBeforeTax = grossProfit - operatingExpenses.total + otherIncome.total;
    const taxableProfit = Math.max(netProfitBeforeTax, 0);
    const companyTax = taxableProfit * 0.30; // 30% CIT rate
    const educationTax = taxableProfit * 0.02; // 2% Education tax
    const totalTaxLiability = companyTax + educationTax;

    // Calculate capital structure
    capitalStructure.retainedEarnings = netProfitBeforeTax - totalTaxLiability;
    capitalStructure.total = capitalStructure.shareCapital + capitalStructure.retainedEarnings + capitalStructure.reserves;

    return {
      revenue,
      costOfSales,
      operatingExpenses,
      otherIncome,
      currentAssets,
      nonCurrentAssets,
      currentLiabilities,
      longTermLiabilities,
      capitalStructure,
      profitSummary: {
        grossProfit,
        netProfitBeforeTax,
        taxableProfit,
        companyTax,
        educationTax,
        totalTaxLiability,
        netProfitAfterTax: netProfitBeforeTax - totalTaxLiability
      },
      balanceSheet: {
        totalAssets: currentAssets.total + nonCurrentAssets.total,
        totalLiabilities: currentLiabilities.total + longTermLiabilities.total,
        totalEquity: capitalStructure.total
      }
    };
  }, [accounts, categoryMappings, selectedYear, additionalInfo]);

  const exportCITReturn = async () => {
    if (!generateCITSchedules) return;

    const wb = new ExcelJS.Workbook();
    const schedules = generateCITSchedules;

    // Company Information Sheet
    const companyInfoWs = wb.addWorksheet("Company Info");
    const companyInfoData = [
      ["COMPANY INCOME TAX RETURN", ""],
      ["Tax Year:", selectedYear],
      ["", ""],
      ["COMPANY DETAILS", ""],
      ["Company Name:", companyDetails.companyName],
      ["TIN Number:", companyDetails.tinNumber],
      ["RC Number:", companyDetails.rcNumber],
      ["Address:", companyDetails.address],
      ["Nature of Business:", companyDetails.businessNature],
      ["Accounting Period End:", companyDetails.accountingPeriod],
    ];
    companyInfoWs.addRows(companyInfoData);

    // Schedule 1: Revenue
    const revenueWs = wb.addWorksheet("Schedule 1 - Revenue");
    const revenueData = [
      ["SCHEDULE 1 - REVENUE", "Amount (₦)"],
      ["Sales Revenue", schedules.revenue.salesRevenue],
      ["Service Revenue", schedules.revenue.serviceRevenue],
      ["Rental Income", schedules.revenue.rentalIncome],
      ["Interest Income", schedules.revenue.interestIncome],
      ["Dividend Income", schedules.revenue.dividendIncome],
      ["Other Revenue", schedules.revenue.otherRevenue],
      ["TOTAL REVENUE", schedules.revenue.total]
    ];
    revenueWs.addRows(revenueData);

    // Schedule 2: Cost of Sales
    const cosWs = wb.addWorksheet("Schedule 2 - Cost of Sales");
    const cosData = [
      ["SCHEDULE 2 - COST OF SALES", "Amount (₦)"],
      ["Opening Stock", schedules.costOfSales.openingStock],
      ["Purchases", schedules.costOfSales.purchases],
      ["Direct Labor", schedules.costOfSales.directLabor],
      ["Factory Overheads", schedules.costOfSales.factoryOverheads],
      ["Less: Closing Stock", schedules.costOfSales.closingStock],
      ["TOTAL COST OF SALES", schedules.costOfSales.total]
    ];
    cosWs.addRows(cosData);

    // Schedule 3: Operating Expenses
    const opexWs = wb.addWorksheet("Schedule 3 - Operating Exp");
    const opexData = [
      ["SCHEDULE 3 - OPERATING EXPENSES", "Amount (₦)"],
      ["Salaries and Wages", schedules.operatingExpenses.salariesAndWages],
      ["Rent", schedules.operatingExpenses.rent],
      ["Utilities", schedules.operatingExpenses.utilities],
      ["Depreciation", schedules.operatingExpenses.depreciation],
      ["Repairs and Maintenance", schedules.operatingExpenses.repairs],
      ["Insurance", schedules.operatingExpenses.insurance],
      ["Advertising", schedules.operatingExpenses.advertising],
      ["Professional Fees", schedules.operatingExpenses.professionalFees],
      ["Bank Charges", schedules.operatingExpenses.bankCharges],
      ["Transport", schedules.operatingExpenses.transport],
      ["Office Supplies", schedules.operatingExpenses.officeSupplies],
      ["Bad Debts", schedules.operatingExpenses.badDebts],
      ["Other Expenses", schedules.operatingExpenses.otherExpenses],
      ["TOTAL OPERATING EXPENSES", schedules.operatingExpenses.total]
    ];
    opexWs.addRows(opexData);

    // Schedule 4: Other Income
    const otherIncomeWs = wb.addWorksheet("Schedule 4 - Other Income");
    const otherIncomeData = [
      ["SCHEDULE 4 - OTHER INCOME", "Amount (₦)"],
      ["Gain on Disposal of Assets", schedules.otherIncome.gainOnDisposal],
      ["Foreign Exchange Gain", schedules.otherIncome.foreignExchangeGain],
      ["Miscellaneous Income", schedules.otherIncome.miscellaneousIncome],
      ["TOTAL OTHER INCOME", schedules.otherIncome.total]
    ];
    otherIncomeWs.addRows(otherIncomeData);

    // Schedule 5: Current Assets
    const currentAssetsWs = wb.addWorksheet("Schedule 5 - Current Assets");
    const currentAssetsData = [
      ["SCHEDULE 5 - CURRENT ASSETS", "Amount (₦)"],
      ["Cash in Hand", schedules.currentAssets.cash],
      ["Bank Balances", schedules.currentAssets.bankBalances],
      ["Accounts Receivable", schedules.currentAssets.accountsReceivable],
      ["Inventory", schedules.currentAssets.inventory],
      ["Prepaid Expenses", schedules.currentAssets.prepaidExpenses],
      ["Other Current Assets", schedules.currentAssets.otherCurrentAssets],
      ["TOTAL CURRENT ASSETS", schedules.currentAssets.total]
    ];
    currentAssetsWs.addRows(currentAssetsData);

    // Schedule 6: Non-Current Assets
    const nonCurrentAssetsWs = wb.addWorksheet("Schedule 6 - Non-Current Assets");
    const nonCurrentAssetsData = [
      ["SCHEDULE 6 - NON-CURRENT ASSETS", "Amount (₦)"],
      ["Land and Buildings", schedules.nonCurrentAssets.landAndBuildings],
      ["Plant and Machinery", schedules.nonCurrentAssets.plantAndMachinery],
      ["Motor Vehicles", schedules.nonCurrentAssets.motorVehicles],
      ["Furniture and Fittings", schedules.nonCurrentAssets.furnitureAndFittings],
      ["Investments", schedules.nonCurrentAssets.investments],
      ["Intangible Assets", schedules.nonCurrentAssets.intangibleAssets],
      ["Other Non-Current Assets", schedules.nonCurrentAssets.otherNonCurrentAssets],
      ["TOTAL NON-CURRENT ASSETS", schedules.nonCurrentAssets.total]
    ];
    nonCurrentAssetsWs.addRows(nonCurrentAssetsData);

    // Schedule 7: Current Liabilities
    const currentLiabilitiesWs = wb.addWorksheet("Schedule 7 - Current Liab");
    const currentLiabilitiesData = [
      ["SCHEDULE 7 - CURRENT LIABILITIES", "Amount (₦)"],
      ["Accounts Payable", schedules.currentLiabilities.accountsPayable],
      ["Short Term Loans", schedules.currentLiabilities.shortTermLoans],
      ["Accrued Expenses", schedules.currentLiabilities.accruedExpenses],
      ["Tax Payable", schedules.currentLiabilities.taxPayable],
      ["Other Current Liabilities", schedules.currentLiabilities.otherCurrentLiabilities],
      ["TOTAL CURRENT LIABILITIES", schedules.currentLiabilities.total]
    ];
    currentLiabilitiesWs.addRows(currentLiabilitiesData);

    // Schedule 8: Long Term Liabilities
    const longTermLiabilitiesWs = wb.addWorksheet("Schedule 8 - Long Term Liab");
    const longTermLiabilitiesData = [
      ["SCHEDULE 8 - LONG TERM LIABILITIES", "Amount (₦)"],
      ["Long Term Loans", schedules.longTermLiabilities.longTermLoans],
      ["Mortgages", schedules.longTermLiabilities.mortgages],
      ["Bonds", schedules.longTermLiabilities.bonds],
      ["Deferred Tax", schedules.longTermLiabilities.deferredTax],
      ["Other Long Term Liabilities", schedules.longTermLiabilities.otherLongTermLiabilities],
      ["TOTAL LONG TERM LIABILITIES", schedules.longTermLiabilities.total]
    ];
    longTermLiabilitiesWs.addRows(longTermLiabilitiesData);

    // Schedule 9: Capital Structure
    const capitalWs = wb.addWorksheet("Schedule 9 - Capital");
    const capitalData = [
      ["SCHEDULE 9 - CAPITAL STRUCTURE", "Amount (₦)"],
      ["Share Capital", schedules.capitalStructure.shareCapital],
      ["Retained Earnings", schedules.capitalStructure.retainedEarnings],
      ["Reserves", schedules.capitalStructure.reserves],
      ["TOTAL CAPITAL", schedules.capitalStructure.total]
    ];
    capitalWs.addRows(capitalData);

    // Profit & Loss Statement
    const plWs = wb.addWorksheet("Profit & Loss Statement");
    const plData = [
      ["PROFIT & LOSS STATEMENT", "Amount (₦)"],
      ["Revenue", schedules.revenue.total],
      ["Less: Cost of Sales", schedules.costOfSales.total],
      ["GROSS PROFIT", schedules.profitSummary.grossProfit],
      ["Less: Operating Expenses", schedules.operatingExpenses.total],
      ["Add: Other Income", schedules.otherIncome.total],
      ["NET PROFIT BEFORE TAX", schedules.profitSummary.netProfitBeforeTax],
      ["", ""],
      ["TAX COMPUTATION", ""],
      ["Taxable Profit", schedules.profitSummary.taxableProfit],
      ["Company Income Tax (30%)", schedules.profitSummary.companyTax],
      ["Education Tax (2%)", schedules.profitSummary.educationTax],
      ["TOTAL TAX LIABILITY", schedules.profitSummary.totalTaxLiability],
      ["NET PROFIT AFTER TAX", schedules.profitSummary.netProfitAfterTax]
    ];
    plWs.addRows(plData);

    // Balance Sheet
    const bsWs = wb.addWorksheet("Balance Sheet");
    const bsData = [
      ["BALANCE SHEET", "Amount (₦)"],
      ["ASSETS", ""],
      ["Current Assets", schedules.currentAssets.total],
      ["Non-Current Assets", schedules.nonCurrentAssets.total],
      ["TOTAL ASSETS", schedules.balanceSheet.totalAssets],
      ["", ""],
      ["LIABILITIES", ""],
      ["Current Liabilities", schedules.currentLiabilities.total],
      ["Long Term Liabilities", schedules.longTermLiabilities.total],
      ["TOTAL LIABILITIES", schedules.balanceSheet.totalLiabilities],
      ["", ""],
      ["EQUITY", ""],
      ["Total Equity", schedules.balanceSheet.totalEquity],
      ["", ""],
      ["TOTAL LIABILITIES & EQUITY", schedules.balanceSheet.totalLiabilities + schedules.balanceSheet.totalEquity]
    ];
    bsWs.addRows(bsData);

    const filename = `CIT_Return_${companyDetails.companyName || 'Company'}_${selectedYear}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return `₦${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  if (!generateCITSchedules) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-gray-400">
        <p className="text-gray-600">No data available for CIT filing. Please upload your account statements first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-yellow-500">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold text-gray-800">🏛️ CIT Filing Assistant (FIRS)</h3>
        <div className="flex items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="mr-2 border border-gray-300 rounded-md px-2 py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {[2024, 2023, 2022, 2021, 2020].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className="text-yellow-500 focus:outline-none">
            {isOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 border-t pt-4">
          {/* Company Details Section */}
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
              <input
                type="text"
                placeholder="Nature of Business"
                value={companyDetails.businessNature}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, businessNature: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <select
                value={companyDetails.accountingPeriod}
                onChange={(e) => setCompanyDetails(prev => ({ ...prev, accountingPeriod: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="December">December</option>
                <option value="March">March</option>
                <option value="June">June</option>
                <option value="September">September</option>
              </select>
            </div>
          </div>

          {/* Tax Summary */}
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

          {/* CIT Schedules Overview */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3">CIT Schedules Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">📈 Schedule 1: Revenue</h5>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(generateCITSchedules.revenue.total)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">📦 Schedule 2: Cost of Sales</h5>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(generateCITSchedules.costOfSales.total)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">💰 Schedule 3: Operating Expenses</h5>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(generateCITSchedules.operatingExpenses.total)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">✨ Schedule 4: Other Income</h5>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(generateCITSchedules.otherIncome.total)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">🏦 Schedule 5: Current Assets</h5>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(generateCITSchedules.currentAssets.total)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">🏢 Schedule 6: Non-Current Assets</h5>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(generateCITSchedules.nonCurrentAssets.total)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">💳 Schedule 7: Current Liabilities</h5>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(generateCITSchedules.currentLiabilities.total)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">📉 Schedule 8: Long Term Liabilities</h5>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(generateCITSchedules.longTermLiabilities.total)}
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-sm text-gray-800 mb-2">📊 Schedule 9: Capital Structure</h5>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(generateCITSchedules.capitalStructure.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Important CIT Filing Notes</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• This is an automated draft based on your transaction data</li>
              <li>• Please review all schedules carefully before filing</li>
              <li>• Ensure opening balances and capital contributions are accurate</li>
              <li>• Verify asset values and depreciation calculations with your accountant</li>
              <li>• CIT returns must be filed within 6 months of year-end</li>
              <li>• Pay applicable taxes to avoid penalties and interest</li>
            </ul>
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
        </div>
      )}
    </div>
  );
};

CITFilingAssistant.propTypes = {
  accounts: PropTypes.arrayOf(PropTypes.object).isRequired,
  categoryMappings: PropTypes.object,
};

export default CITFilingAssistant;