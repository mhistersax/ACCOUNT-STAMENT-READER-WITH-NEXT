"use client";
// path: src/app/page.js
import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AccountSummary from "../components/AccountSummary";
import TransactionController from "../components/TransactionController";
import VatBreakdown from "../components/VatBreakdown";
import AccountTabs from "../components/AccountTabs";
import AggregateCalculations from "../components/AggregateCalculations";
import VatableTransactionSelector from "../components/VatableTransactionSelector";
import FirsVatExport from "../components/FirsVatExport";
import DragDropUpload from "../components/DragDropUpload";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // vatableSelections now stores the full breakdown and the vatStatusMap for each account
  const [vatableSelections, setVatableSelections] = useState({});
  const [processingProgress, setProcessingProgress] = useState(0);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const processExcelFile = (file, fileName) => {
    if (!file) {
      setError("No file provided");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessingProgress(10); // Start progress

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          throw new Error("Failed to read file content");
        }

        setProcessingProgress(30); // Update progress

        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
          dateNF: "yyyy-mm-dd",
        });

        setProcessingProgress(50); // Update progress

        if (
          !workbook ||
          !workbook.SheetNames ||
          workbook.SheetNames.length === 0
        ) {
          throw new Error("Invalid Excel file format or empty workbook");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error("Could not read worksheet data");
        }

        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!Array.isArray(rawData) || rawData.length === 0) {
          throw new Error("No data found in the Excel file");
        }

        setProcessingProgress(60); // Update progress

        const extractCellValue = (row, col) => {
          if (rawData[row] && rawData[row][col] !== undefined) {
            return rawData[row][col];
          }
          return null;
        };

        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (
            row &&
            row.includes("Date") &&
            (row.includes("Debit") || row.includes("Credit"))
          ) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error(
            "Could not find transaction headers in the Excel file. Expected columns: Date, Debit/Credit"
          );
        }

        const headers = rawData[headerRowIndex];
        const columnIndices = {
          date: headers.indexOf("Date"),
          narration: headers.indexOf("Narration"),
          reference: headers.indexOf("Reference"),
          debit: headers.indexOf("Debit"),
          credit: headers.indexOf("Credit"),
          balance: headers.indexOf("Balance"),
        };

        const missingColumns = [];
        if (columnIndices.date === -1) missingColumns.push("Date");
        if (columnIndices.debit === -1) missingColumns.push("Debit");
        if (columnIndices.credit === -1) missingColumns.push("Credit");

        if (missingColumns.length > 0) {
          throw new Error(
            `Missing essential columns in the transaction table: ${missingColumns.join(
              ", "
            )}`
          );
        }

        setProcessingProgress(70); // Update progress

        const safeNumber = (value) => {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };

        const accountInfo = {
          accountName:
            extractCellValue(2, 2) ||
            fileName.split(".")[0] ||
            "Unknown Account",
          accountNumber: extractCellValue(3, 2) || "N/A",
          currency: extractCellValue(4, 2) || "NGN",
          openingBalance: safeNumber(extractCellValue(2, 12)),
          closingBalance: safeNumber(extractCellValue(3, 12)),
          totalDebit: safeNumber(extractCellValue(4, 12)),
          totalCredit: safeNumber(extractCellValue(5, 12)),
          statementPeriod: extractCellValue(5, 2) || "N/A",
        };

        const transactionData = [];
        let totalCreditFromFile = 0; // Use a different name to avoid confusion with VATable total
        let totalDebitFromFile = 0;

        let transactionIdCounter = 1; // Counter for unique IDs

        const initialVatStatusMap = {}; // Map to store initial VAT status for each transaction ID
        let initialVatableTotal = 0;
        let initialZeroRatedTotal = 0;
        let initialVatExemptTotal = 0;
        let initialNonVatableTotal = 0;

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0 || !row[columnIndices.date]) continue;

          const creditAmount = safeNumber(row[columnIndices.credit]);
          const debitAmount = safeNumber(row[columnIndices.debit]);

          totalCreditFromFile += creditAmount;
          totalDebitFromFile += debitAmount;

          const txId = `tx-${Date.now()}-${transactionIdCounter++}`; // Generate unique ID
          const transaction = {
            id: txId,
            date: row[columnIndices.date],
            narration: row[columnIndices.narration] || "",
            reference: row[columnIndices.reference] || "",
            debit: debitAmount,
            credit: creditAmount,
            balance: safeNumber(row[columnIndices.balance]),
          };
          transactionData.push(transaction);

          // Initialize VAT status for credit transactions to 'vatable' by default
          if (creditAmount > 0) {
            initialVatStatusMap[txId] = "vatable";
            initialVatableTotal += creditAmount;
          }
        }

        if (transactionData.length === 0) {
          throw new Error("No valid transactions found in the Excel file");
        }

        setProcessingProgress(90); // Update progress

        const vatRate = 0.075;
        const initialVatAmount = initialVatableTotal * vatRate;
        const initialCreditAfterVat = totalCreditFromFile - initialVatAmount;

        const newAccountId = `account-${Date.now()}`;
        const newAccount = {
          id: newAccountId,
          fileName: fileName || "Unnamed Account",
          accountInfo,
          transactions: transactionData,
          calculations: {
            totalCredit: totalCreditFromFile,
            totalDebit: totalDebitFromFile,
            // Initial calculations based on default VATable selections
            vatAmount: initialVatAmount,
            creditAfterVat: initialCreditAfterVat,
            vatableTotal: initialVatableTotal,
            zeroRatedTotal: initialZeroRatedTotal, // Default 0
            vatExemptTotal: initialVatExemptTotal, // Default 0
            nonVatableTotal: initialNonVatableTotal, // Default 0
          },
        };

        setProcessingProgress(100); // Complete progress

        setAccounts((prevAccounts) => {
          const newAccounts = [...prevAccounts, newAccount];
          setActiveAccountIndex(newAccounts.length - 1);
          return newAccounts;
        });

        // Initialize vatableSelections state for the new account with its default vatStatusMap
        setVatableSelections((prev) => ({
          ...prev,
          [newAccountId]: {
            vatStatusMap: initialVatStatusMap,
            vatableTotal: initialVatableTotal,
            zeroRatedTotal: initialZeroRatedTotal,
            vatExemptTotal: initialVatExemptTotal,
            nonVatableTotal: initialNonVatableTotal,
            totalCredit: totalCreditFromFile,
            vatAmount: initialVatAmount,
            creditAfterVat: initialCreditAfterVat,
            // Include counts for initial FIRS export summary
            vatableCount: Object.values(initialVatStatusMap).filter(s => s === 'vatable').length,
            zeroRatedCount: Object.values(initialVatStatusMap).filter(s => s === 'zeroRated').length,
            vatExemptCount: Object.values(initialVatStatusMap).filter(s => s === 'vatExempt').length,
            nonVatableCount: Object.values(initialVatStatusMap).filter(s => s === 'nonVatable').length,
          },
        }));

        toast.success(`Successfully processed ${fileName}`);
      } catch (err) {
        setError(`Error processing Excel file ${fileName}: ${err.message}`);
        console.error("Processing error:", err);
      } finally {
        setIsLoading(false);
        setTimeout(() => setProcessingProgress(0), 1000);
      }
    };

    reader.onerror = (event) => {
      setError(`Failed to read file: ${fileName}`);
      console.error("File reading error:", event);
      setIsLoading(false);
      setProcessingProgress(0);
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(`Error accessing file: ${err.message}`);
      setIsLoading(false);
      setProcessingProgress(0);
    }
  };

  const handleFileUpload = (e) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) {
        setError("No file selected. Please select an Excel file.");
        return;
      }

      const file = files[0];

      const fileExt = file.name.split(".").pop().toLowerCase();
      if (fileExt !== "xlsx" && fileExt !== "xls") {
        setError(
          "Invalid file format. Please upload an Excel file (.xlsx or .xls)"
        );
        return;
      }

      processExcelFile(file, file.name);
    } catch (error) {
      setError(`Error handling file upload: ${error.message}`);
      console.error("File upload error:", error);
    }
  };

  const handleRemoveAccount = (index) => {
    const accountToRemove = accounts[index];
    setDialogProps({
      isOpen: true,
      title: "Remove Account",
      message: `Are you sure you want to remove ${
        accountToRemove.accountInfo.accountName || accountToRemove.fileName
      } from the analysis?`,
      onConfirm: () => removeAccount(index),
    });
  };

  const removeAccount = (indexToRemove) => {
    if (indexToRemove < 0 || indexToRemove >= accounts.length) {
      return;
    }

    setAccounts((prevAccounts) => {
      const newAccounts = prevAccounts.filter(
        (_, index) => index !== indexToRemove
      );

      if (activeAccountIndex === indexToRemove) {
        setActiveAccountIndex(Math.max(0, newAccounts.length - 1));
      } else if (activeAccountIndex > indexToRemove) {
        setActiveAccountIndex(activeAccountIndex - 1);
      }

      // Also remove from vatableSelections
      setVatableSelections((prevVatSelections) => {
        const newVatSelections = { ...prevVatSelections };
        const accountIdToRemove = accounts[indexToRemove].id;
        delete newVatSelections[accountIdToRemove];
        return newVatSelections;
      });

      return newAccounts;
    });

    toast.info("Account removed from analysis");
    setDialogProps({ ...dialogProps, isOpen: false }); // Close dialog after confirmation
  };

  // Handle updates from VATable transaction selector
  const handleVatableSelectionChange = (accountId, vatableData) => {
    if (!vatableData || typeof vatableData !== "object") {
      console.error("Invalid vatableData received", vatableData);
      return;
    }

    // Ensure vatableData includes all new properties from selector
    const safeVatableData = {
      vatStatusMap: {},
      vatableTotal: 0,
      zeroRatedTotal: 0,
      vatExemptTotal: 0,
      nonVatableTotal: 0,
      vatAmount: 0,
      totalCredit: 0,
      creditAfterVat: 0,
      vatableCount: 0,
      zeroRatedCount: 0,
      vatExemptCount: 0,
      nonVatableCount: 0,
      ...vatableData,
    };

    setVatableSelections((prev) => ({
      ...prev,
      [accountId]: safeVatableData,
    }));

    setAccounts((prevAccounts) => {
      return prevAccounts.map((account) => {
        if (account.id === accountId) {
          const currentCalcs = account.calculations || {};

          const updatedCalculations = {
            ...currentCalcs,
            totalCredit: safeVatableData.totalCredit, // Use the total from the selector
            vatableTotal: safeVatableData.vatableTotal,
            zeroRatedTotal: safeVatableData.zeroRatedTotal, // NEW
            vatExemptTotal: safeVatableData.vatExemptTotal, // NEW
            nonVatableTotal: safeVatableData.nonVatableTotal,
            vatAmount: safeVatableData.vatAmount,
            creditAfterVat: safeVatableData.creditAfterVat, // Use creditAfterVat directly from selector
          };

          return {
            ...account,
            calculations: updatedCalculations,
          };
        }
        return account;
      });
    });
  };

  const activeAccount =
    accounts.length > 0 &&
    activeAccountIndex >= 0 &&
    activeAccountIndex < accounts.length
      ? accounts[activeAccountIndex]
      : null;

  // Calculate aggregate values across all accounts
  const aggregateCalculations = accounts.length > 0
    ? accounts.reduce(
        (totals, account) => {
          if (!account || !account.calculations) return totals;

          const calculations = account.calculations; // Already has defaults from Home processing

          totals.totalCredit += calculations.totalCredit || 0;
          totals.totalDebit += calculations.totalDebit || 0;
          totals.vatAmount += calculations.vatAmount || 0;
          totals.creditAfterVat += calculations.creditAfterVat || 0;

          // Aggregate the new VAT categories
          totals.vatableTotal += calculations.vatableTotal || 0;
          totals.zeroRatedTotal += calculations.zeroRatedTotal || 0; // NEW
          totals.vatExemptTotal += calculations.vatExemptTotal || 0; // NEW
          totals.nonVatableTotal += calculations.nonVatableTotal || 0;

          return totals;
        },
        {
          totalCredit: 0,
          totalDebit: 0,
          vatAmount: 0,
          creditAfterVat: 0,
          vatableTotal: 0,
          zeroRatedTotal: 0, // Initialize new totals
          vatExemptTotal: 0, // Initialize new totals
          nonVatableTotal: 0,
        }
      )
    : {
        totalCredit: 0,
        totalDebit: 0,
        vatAmount: 0,
        creditAfterVat: 0,
        vatableTotal: 0,
        zeroRatedTotal: 0,
        vatExemptTotal: 0,
        nonVatableTotal: 0,
      };

  // Filter only credit transactions for the VATable selector
  const getCreditTransactions = useCallback((transactions) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    return transactions.filter(
      (transaction) => transaction && transaction.credit > 0
    );
  }, []);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (accounts.length === 0) return;

      // Export to FIRS - Ctrl+E
      if (e.ctrlKey && e.key === "e" && !e.shiftKey) {
        e.preventDefault();
        // Trigger export logic if you have a way to expose it or move it to Home.js
        // For now, this is just a toast, but in a real app, you'd trigger the FirsVatExport component's function
        toast.info("Shortcut detected: Export to FIRS (Functionality needs to be wired)");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accounts]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Multi-Account Statement Reader
        </h1>
        <p className="text-gray-600">
          Upload multiple bank account statements to analyze credits and debits
          across all your stores
        </p>
      </header>

      {/* Step Guide for New Users */}
      {accounts.length === 0 && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-blue-800 mb-4">
            How It Works
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                  1
                </div>
                <h4 className="font-medium">Upload Statement</h4>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Upload your Excel bank statement files using the uploader below.
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                  2
                </div>
                <h4 className="font-medium">Select VATable Transactions</h4>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Choose which credit transactions should have VAT (7.5%) applied
                and specify their VAT status.
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2">
                  3
                </div>
                <h4 className="font-medium">Export for FIRS</h4>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Export your VATable transactions in the format required by FIRS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Improved File Upload Section */}
      <div className="mb-8">
        <div className="max-w-xl mx-auto">
          {isLoading ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Processing File...
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">
                {processingProgress < 30 && "Reading file..."}
                {processingProgress >= 30 &&
                  processingProgress < 50 &&
                  "Parsing data..."}
                {processingProgress >= 50 &&
                  processingProgress < 80 &&
                  "Processing transactions..."}
                {processingProgress >= 80 && "Finalizing..."}
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {accounts.length === 0
                  ? "Upload Your First Statement"
                  : "Add Another Statement"}
              </h3>

              <DragDropUpload
                onFileSelect={handleFileUpload}
                accept=".xlsx,.xls"
                disabled={isLoading}
              />

              <div className="mt-4 text-sm text-gray-500">
                <p>
                  <span className="inline-flex items-center mr-2">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    Supported formats:
                  </span>
                  Excel (.xlsx, .xls)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
          <div className="flex">
            <svg
              className="h-6 w-6 text-red-500 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {accounts.length > 0 && (
        <>
          {/* Account Tabs */}
          <AccountTabs
            accounts={accounts}
            activeIndex={activeAccountIndex}
            setActiveIndex={setActiveAccountIndex}
            onRemoveAccountRequest={handleRemoveAccount} // Corrected prop name
          />

          {/* Quick Stats Dashboard */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <svg
                    className="h-6 w-6 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credit</p>
                  <p className="text-lg font-semibold">
                    ₦
                    {aggregateCalculations.totalCredit.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 mr-4">
                  <svg
                    className="h-6 w-6 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Debit</p>
                  <p className="text-lg font-semibold">
                    ₦
                    {aggregateCalculations.totalDebit.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <svg
                    className="h-6 w-6 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">VAT (7.5%)</p>
                  <p className="text-lg font-semibold">
                    ₦
                    {aggregateCalculations.vatAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 mr-4">
                  <svg
                    className="h-6 w-6 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net After VAT</p>
                  <p className="text-lg font-semibold">
                    ₦
                    {aggregateCalculations.creditAfterVat.toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 2 }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregate calculations card */}
          <AggregateCalculations
            calculations={aggregateCalculations}
            accountCount={accounts.length}
          />

          {/* Active account details */}
          {activeAccount && (
            <div>
              <AccountSummary accountData={activeAccount.accountInfo} />

              {/* VATable Transaction Selector Component */}
              {activeAccount.transactions &&
                activeAccount.transactions.length > 0 && (
                  <VatableTransactionSelector
                    creditTransactions={getCreditTransactions(
                      activeAccount.transactions
                    )}
                    // Pass the vatStatusMap for the current account
                    vatStatusMap={
                      vatableSelections[activeAccount.id]?.vatStatusMap || {}
                    }
                    onVatableSelectionChange={(vatableData) =>
                      handleVatableSelectionChange(
                        activeAccount.id,
                        vatableData
                      )
                    }
                  />
                )}

              {/* FIRS VAT Export Component */}
              {activeAccount.transactions &&
                activeAccount.transactions.length > 0 && (
                  <FirsVatExport
                    transactions={activeAccount.transactions}
                    // Pass the full vatableSelections object for the active account
                    vatableSelections={vatableSelections[activeAccount.id] || {}}
                    accountInfo={activeAccount.accountInfo}
                  />
                )}

              {/* Vat Breakdown Component (now receives new props) */}
              <VatBreakdown
                totalCredit={activeAccount.calculations.totalCredit || 0}
                vatableTotal={activeAccount.calculations.vatableTotal || 0}
                zeroRatedTotal={activeAccount.calculations.zeroRatedTotal || 0} // NEW PROP
                vatExemptTotal={activeAccount.calculations.vatExemptTotal || 0} // NEW PROP
                nonVatableTotal={activeAccount.calculations.nonVatableTotal || 0}
                vatAmount={activeAccount.calculations.vatAmount || 0}
                creditAfterVat={activeAccount.calculations.creditAfterVat || 0}
              />

              <TransactionController
                transactions={activeAccount.transactions || []}
              />
            </div>
          )}

          {/* Help & Tips Section */}
          <div className="mt-12 bg-white rounded-lg shadow p-4">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setHelpExpanded(!helpExpanded)}
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Help & Tips
              </h3>
              <button>
                {helpExpanded ? (
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </button>
            </div>

            {helpExpanded && (
              <div className="mt-4 border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      How do I select which transactions are VATable?
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Use the radio buttons in the &quot;Select VAT Status for
                      Credit Transactions&quot; section to mark each credit
                      transaction as VATable (7.5%), Zero-Rated (0%), VAT Exempt
                      (0%), or Non-VATable. By default, all credit transactions
                      are marked as VATable.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      What format does FIRS require for VAT filing?
                    </h4>
                    <p className="text-gray-600 text-sm">
                      FIRS requires VAT filings to include specific information
                      about each transaction. Use the &quot;FIRS VAT Export&quot;
                      feature to generate an Excel file in the required format.
                      You&apos;ll need to add customer TIN numbers before
                      submission.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Can I upload multiple bank statements?
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Yes, you can upload multiple statements and switch between
                      them using the tabs at the top. The &quot;Combined
                      Calculations&quot; section shows aggregated totals across
                      all your accounts.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      What Excel file format is supported?
                    </h4>
                    <p className="text-gray-600 text-sm">
                      The app supports Excel files (.xlsx and .xls) with a
                      specific structure. Your bank statement should include
                      columns for Date, Narration, Reference, Debit, Credit, and
                      Balance.
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-gray-50 p-3 rounded text-xs text-gray-500">
                  <span className="font-medium">Keyboard shortcuts: </span>
                  <span className="ml-2">Ctrl+E = Export to FIRS</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {accounts.length === 0 && !isLoading && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-4">
            Start by Uploading Your First Statement
          </h2>
          <p className="text-gray-600 mb-6">
            Upload Excel (.xlsx) account statements for each of your stores to
            see combined calculations
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogProps.isOpen}
        onClose={() => setDialogProps({ ...dialogProps, isOpen: false })}
        onConfirm={dialogProps.onConfirm}
        title={dialogProps.title}
        message={dialogProps.message}
      />

      {/* Toast Notifications */}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}